<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AdminAuth;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Validation\Validator;

final readonly class AdminAuthController
{
    public function __construct(private AdminAuth $auth)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $v = new Validator($request->json());
        $prenom = $v->string('prenom', max: 50);
        $motDePasse = $v->string('motDePasse', max: 200);
        $v->validate();

        $token = $this->auth->login((string) $prenom, (string) $motDePasse, $request->ip);

        return new JsonResponse(['prenom' => $prenom], 200, ['Set-Cookie' => $this->auth->sessionCookie($token)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request);

        return new JsonResponse(null, 204, ['Set-Cookie' => $this->auth->clearCookie()]);
    }

    public function session(Request $request): JsonResponse
    {
        return new JsonResponse(['prenom' => $this->auth->require($request)]);
    }
}
