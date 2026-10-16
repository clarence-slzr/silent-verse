// puzzles.js — Multiple choice poems
// Format: { excerpt, question, choices, correct, source }

export const PUZZLES = [
    {
        title: 'Viraha',
        excerpt:
            `Sanskrit speaks of it as though separation
were not the adversary of love, but its most
merciless tutor.

We spend our lives believing affection ripens
beneath sunlight...`,
        question: 'What is the title of this poem?',
        choices: ['Viraha', 'Halaga', 'Haraya', 'XLVI'],
        correct: 'Viraha'
    },
    {
        title: 'Mamihlapinatapai',
        excerpt:
            `A word from Tierra del Fuego —
a look shared between two people,
each hoping the other will offer
something that both desire
but neither is willing to begin.`,
        question: 'What is the title of this poem?',
        choices: ['Mamihlapinatapai', 'Viraha', 'Kundiman sa Gitna ng Dilim', 'Ang Agham ng Iyong Ngiti'],
        correct: 'Mamihlapinatapai'
    },
    {
        title: 'XLVI',
        excerpt:
            `Forty-six fragments of a heart
arranged in careful rows,
each one whispering a name
that only silence knows.`,
        question: 'What is the title of this poem?',
        choices: ['XLVI', 'Viraha', 'Halaga', 'Haraya'],
        correct: 'XLVI'
    },
    {
        title: 'Halaga',
        excerpt:
            `Hindi sa laki ng regalo nasusukat ang pagmamahal,
kundi sa tibok ng pusong handang magbigay
ng kahit kaunti — basta\'t bukal sa loob.`,
        question: 'What is the title of this poem?',
        choices: ['Halaga', 'Haraya', 'XLVI', 'Viraha'],
        correct: 'Halaga'
    },
    {
        title: 'Haraya',
        excerpt:
            `Sa bawat guni-guni, ikaw ang bida.
Sa bawat panaginip, ikaw ang tula.
Ang haraya ko\'y walang hangganan —
ikaw ang simula, ikaw ang dulo.`,
        question: 'What is the title of this poem?',
        choices: ['Haraya', 'Halaga', 'Viraha', 'Mamihlapinatapai'],
        correct: 'Haraya'
    },
    {
        title: 'Kundiman sa Gitna ng Dilim',
        excerpt:
            `Sa gitna ng dilim, may tinig na umaawit —
isang kundiman para sa pusong
naghahanap ng liwanag
sa mata ng minamahal.`,
        question: 'What is the title of this poem?',
        choices: ['Kundiman sa Gitna ng Dilim', 'Haraya', 'Halaga', 'XLVI'],
        correct: 'Kundiman sa Gitna ng Dilim'
    },
    {
        title: 'Ang Agham ng Iyong Ngiti',
        excerpt:
            `Pinag-aaralan ko ang bawat kurba
ng iyong labi tuwing ikaw ay ngumingiti —
isang agham na walang pormula,
isang teorya na hindi kayang patunayan
ng kahit anong laboratoryo.`,
        question: 'What is the title of this poem?',
        choices: ['Ang Agham ng Iyong Ngiti', 'Kundiman sa Gitna ng Dilim', 'Viraha', 'XLVI'],
        correct: 'Ang Agham ng Iyong Ngiti'
    }
];

export const FINAL_POEM_URL = 'https://bloggerniamir.blogspot.com/2026/10/ang-ngiti-sa-likod-ng-iyong-mga-mata.html';