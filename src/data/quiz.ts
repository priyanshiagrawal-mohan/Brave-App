import { atDay, daysFromToday } from '../lib/format'
import type { LibraryItem, Module } from './types'

export interface Question {
  q: string
  options: string[]
  answer: number
}

export const PASS_MARK = 6

export function MODULES(): Module[] {
  return [
    {
      n: 1, title: 'Finding your first client', minutes: 12, status: 'passed', score: 8, partsDone: 3,
      parts: [{ title: 'Where local businesses lose money', min: 4 }, { title: 'Walking in and starting the talk', min: 5 }, { title: 'Writing down the lead', min: 3 }],
      missed: ['Q2 · Best time to visit a shop', 'Q7 · What to note after the first talk'],
    },
    {
      n: 2, title: 'Writing a brochure that sells', minutes: 11, status: 'passed', score: 7, partsDone: 3,
      parts: [{ title: 'Picking sample projects', min: 4 }, { title: 'Before and after, in numbers', min: 4 }, { title: 'Sharing it on WhatsApp', min: 3 }],
      missed: ['Q3 · How many samples to show', 'Q5 · Pricing on the brochure', 'Q8 · File size for WhatsApp'],
    },
    {
      n: 3, title: 'Pricing your first offer', minutes: 13, status: 'passed', score: 9, partsDone: 3,
      parts: [{ title: 'Value, not hours', min: 5 }, { title: 'Advance and phases', min: 4 }, { title: 'When the owner says it is too much', min: 4 }],
      missed: ['Q6 · Discounts for friends'],
    },
    {
      n: 4, title: 'Running a sales conversation', minutes: 14, status: 'open', partsDone: 1, openedAt: atDay(-3, '19:00'),
      parts: [{ title: 'Opening the talk', min: 4 }, { title: 'Finding the problem', min: 6 }, { title: 'Asking for the advance', min: 4 }],
    },
    {
      n: 5, title: 'Delivering and getting paid', minutes: 15, status: 'locked', partsDone: 0, opensOn: daysFromToday(13),
      parts: [{ title: 'Phases and demos', min: 5 }, { title: 'Collecting with UPI', min: 5 }, { title: 'Asking for a testimonial', min: 5 }],
    },
  ]
}

/** Module 4 quiz. Ten questions, pass mark 6. */
export const QUIZ: Question[] = [
  {
    q: 'You walk into a sweet shop at 6 pm, their busiest hour. What do you do?',
    options: ['Start your pitch while the owner bills customers', 'Ask when you can come back for 10 minutes', 'Leave the brochure on the counter', 'Message the owner on Instagram instead'],
    answer: 1,
  },
  {
    q: 'What is the first thing to learn in a sales conversation?',
    options: ['How much the owner can pay', 'What is slowing the business down or costing money', 'Which apps the owner uses', 'How many staff they have'],
    answer: 1,
  },
  {
    q: 'What should you ask for before starting work?',
    options: ['Nothing until the owner is satisfied', 'The full amount, once the work is live', 'An advance, the rest split across phases', 'A signed agreement only'],
    answer: 2,
  },
  {
    q: 'When should you send the agreement?',
    options: ['Before the first meeting', 'Right after price and scope are agreed', 'After the project is delivered', 'Only if the owner asks for it'],
    answer: 1,
  },
  {
    q: 'The owner asks, "Who else have you built this for?" You have done one similar project. You say:',
    options: ['"Many shops in the city"', 'Show the one project and what changed for that owner', '"It is confidential"', 'Change the topic to price'],
    answer: 1,
  },
  {
    q: 'Which note is most useful after a call?',
    options: ['"Called, will follow up."', '"Owner busy."', '"Agreed ₹30k for order bot. Sending terms tonight."', '"Good call."'],
    answer: 2,
  },
  {
    q: 'How many follow-ups should you plan before giving up on a lead?',
    options: ['One', 'At least three, spread across 3–4 days', 'Ten in one day', 'None; wait for the owner to call'],
    answer: 1,
  },
  {
    q: 'An owner met through your uncle wants to work with you. Is that allowed?',
    options: ['No, never', 'Yes, but explain how you know them; it is reviewed more closely', 'Yes, and no proof is needed', 'Only if another team agrees'],
    answer: 1,
  },
  {
    q: 'The owner says ₹30,000 is too much. The best first response is:',
    options: ['Drop the price to ₹15,000 straight away', 'Walk away', 'Offer a smaller first phase at a lower price', 'Say the price is fixed by NIAT'],
    answer: 2,
  },
  {
    q: 'Which payment proof will a BRD reviewer accept?',
    options: ['A verbal confirmation', 'A full UPI receipt showing amount, date and UTR', 'A cropped screenshot of the amount', 'A note in your own words'],
    answer: 1,
  },
]

export function LIBRARY(): LibraryItem[] {
  return [
    { id: 'v1', kind: 'video', title: 'Booking calling agent, built end to end', meta: '22 min', saved: true },
    { id: 'v2', kind: 'video', title: 'WhatsApp order bot for a sweet shop', meta: '18 min' },
    { id: 'v3', kind: 'video', title: 'Pricing a website for a clinic', meta: '11 min' },
    { id: 'v4', kind: 'video', title: 'Inventory app with low-stock alerts', meta: '25 min' },
    { id: 'p1', kind: 'podcast', title: 'From college hostel to ₹1 lakh in projects', meta: 'Episode 4 · 32 min' },
    { id: 'p2', kind: 'podcast', title: 'What shop owners actually want from tech', meta: 'Episode 3 · 28 min' },
    { id: 'p3', kind: 'podcast', title: 'How to ask for an advance without feeling awkward', meta: 'Episode 2 · 21 min' },
    { id: 'e1', kind: 'event', title: 'Ask a CA: GST for student freelancers', meta: 'Sat, 6 pm · online' },
    { id: 'e2', kind: 'event', title: 'Restaurant owners panel', meta: 'Next Thu, 5 pm · Hyderabad campus' },
  ]
}
