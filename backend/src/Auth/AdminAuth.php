<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\HttpException;
use App\Http\Request;
use App\Repository\JournalRepository;
use PDO;

/**
 * Authentification de l'espace responsable : prénom + mot de passe partagé.
 *
 * Les sessions sont stockées en base (table session_admin) ; le navigateur ne détient qu'un jeton aléatoire,
 * dans un cookie HttpOnly / SameSite=Strict. Seule l'empreinte SHA-256 du jeton est conservée en base.
 * La session expire après SESSION_HOURS heures d'inactivité.
 */
final readonly class AdminAuth
{
    public const string COOKIE = 'collector_admin';
    public const int SESSION_HOURS = 12;
    public const int MAX_FAILURES = 5;
    public const int FAILURE_WINDOW_MINUTES = 15;

    public function __construct(
        private PDO $db,
        private JournalRepository $journal,
        private string $passwordHash,
        private bool $secureCookie,
    ) {
    }

    /**
     * Vérifie le mot de passe et ouvre une session.
     *
     * @return string jeton de session à placer dans le cookie
     */
    public function login(string $prenom, string $password, string $ip): string
    {
        if ($this->passwordHash === '') {
            throw new HttpException(503, 'admin_not_configured', 'L\'accès responsable n\'est pas configuré.');
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM tentative_connexion
             WHERE ip = ? AND tente_le > NOW() - INTERVAL ' . self::FAILURE_WINDOW_MINUTES . ' MINUTE',
        );
        $stmt->execute([$ip]);
        if ((int) $stmt->fetchColumn() >= self::MAX_FAILURES) {
            throw new HttpException(
                429,
                'too_many_attempts',
                'Trop de tentatives de connexion. Réessayez dans ' . self::FAILURE_WINDOW_MINUTES . ' minutes.',
            );
        }

        if (!password_verify($password, $this->passwordHash)) {
            $this->db->prepare('INSERT INTO tentative_connexion (ip) VALUES (?)')->execute([$ip]);
            throw new HttpException(401, 'invalid_credentials', 'Mot de passe incorrect.');
        }

        $this->purge();
        $token = bin2hex(random_bytes(32));
        $this->db->prepare(
            'INSERT INTO session_admin (jeton_hash, prenom, expire_le)
             VALUES (?, ?, NOW() + INTERVAL ' . self::SESSION_HOURS . ' HOUR)',
        )->execute([self::hash($token), $prenom]);
        $this->journal->log($prenom, 'connexion');

        return $token;
    }

    /**
     * Prénom du responsable connecté, ou null. Prolonge la session à chaque utilisation.
     */
    public function user(Request $request): ?string
    {
        $token = $request->cookie(self::COOKIE);
        if ($token === null || $token === '') {
            return null;
        }

        $hash = self::hash($token);
        $stmt = $this->db->prepare('SELECT prenom FROM session_admin WHERE jeton_hash = ? AND expire_le > NOW()');
        $stmt->execute([$hash]);
        $prenom = $stmt->fetchColumn();
        if ($prenom === false) {
            return null;
        }

        $this->db->prepare(
            'UPDATE session_admin SET expire_le = NOW() + INTERVAL ' . self::SESSION_HOURS . ' HOUR WHERE jeton_hash = ?',
        )->execute([$hash]);

        return (string) $prenom;
    }

    /**
     * @return string prénom du responsable connecté
     * @throws HttpException 401 si aucune session valide
     */
    public function require(Request $request): string
    {
        return $this->user($request) ?? throw HttpException::unauthorized();
    }

    public function logout(Request $request): void
    {
        $token = $request->cookie(self::COOKIE);
        if ($token !== null && $token !== '') {
            $this->db->prepare('DELETE FROM session_admin WHERE jeton_hash = ?')->execute([self::hash($token)]);
        }
    }

    public function sessionCookie(string $token): string
    {
        return $this->cookie($token, self::SESSION_HOURS * 3600);
    }

    public function clearCookie(): string
    {
        return $this->cookie('', 0);
    }

    private function cookie(string $value, int $maxAge): string
    {
        return self::COOKIE . '=' . $value . '; Path=/; Max-Age=' . $maxAge . '; HttpOnly; SameSite=Strict'
            . ($this->secureCookie ? '; Secure' : '');
    }

    /**
     * Supprime les sessions expirées et les tentatives anciennes.
     */
    private function purge(): void
    {
        $this->db->exec('DELETE FROM session_admin WHERE expire_le <= NOW()');
        $this->db->exec('DELETE FROM tentative_connexion WHERE tente_le < NOW() - INTERVAL 1 DAY');
    }

    private static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
