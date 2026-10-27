import { describe, expect, it } from 'vitest'
import { parseContenance } from './contenance'

describe('parseContenance', () => {
  it.each([
    ['500', 1, 500],
    ['1,5', 1000, 1500],
    ['1.5', 1000, 1500],
    [' 75 ', 10, 750],
    ['0,333', 1000, 333],
    ['1 000', 1, 1000],
  ])('« %s » × %i → %i', (texte, facteur, attendu) => {
    expect(parseContenance(texte, facteur)).toBe(attendu)
  })

  it.each(['', 'abc', '-5', '0', '0,0001', '1,2,3', '5g'])('refuse « %s »', (texte) => {
    expect(parseContenance(texte, 1)).toBeNull()
  })
})
