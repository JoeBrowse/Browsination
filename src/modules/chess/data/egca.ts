/**
 * East Glamorgan Chess Association, 2026/27 season: Cardiff Crows' Division 1 fixtures, with the
 * opposition directory (club, venue, night, captain) from the EGCA captains and club-secretaries
 * pages. Data only, loaded into the database on request — see `loadEgca`.
 */
export interface EgcaTeam {
  name: string
  club: string
  venue: string
  address: string
  night: string
  captain: string
  phone: string
  email: string
  notes?: string
}

export interface EgcaFixture {
  round: number
  /** 'YYYY-MM-DD'. */
  date: string
  opponentTeam: string
  home: boolean
}

export const EGCA_SEASON = '2026/27'
export const EGCA_TEAM = 'Cardiff Crows'
export const EGCA_DIVISION = 'Division 1'
/** League matches start at 7:30pm. */
export const EGCA_START_TIME = '19:30'

const CARDIFF = { club: 'Cardiff Chess Club', venue: 'YMCA Community Centre', address: '2 Shakespeare Street, Cardiff, CF24 3ES', night: 'Tue/Wed' }
const NORTH_CARDIFF = { club: 'North Cardiff Chess Club', venue: 'Rhiwbina Recreational Club', address: 'Lon-Y-Dail, Rhiwbina, Cardiff, CF14 6EA', night: 'Tue' }

/** Crows' own club, used as the venue for home matches. */
export const CROWS: EgcaTeam = { name: 'Crows', ...CARDIFF, captain: 'Sam Jukes', phone: '07398 130876', email: 'stjukes@googlemail.com' }

export const EGCA_TEAMS: EgcaTeam[] = [
  CROWS,
  { name: 'Castles', ...CARDIFF, captain: 'Guy Wagner', phone: '07429 425745', email: 'guywagner@btopenworld.com' },
  { name: 'Bishops', ...CARDIFF, captain: 'Peter Quinn', phone: '02920 763351', email: 'peter-gerian@tiscali.co.uk' },
  { name: 'Dragons', ...CARDIFF, captain: 'Bill Harle', phone: '07887 556707', email: 'bill_harle@hotmail.com' },
  { name: 'Cheetahs', ...NORTH_CARDIFF, captain: 'Josh McKenna', phone: '07908 846953', email: 'joshmck96@gmail.com' },
  { name: 'Woodpushers', ...NORTH_CARDIFF, captain: 'John McGregor', phone: '07395 202747', email: 'mcgregor.jm@gmail.com' },
  { name: 'Celts', club: 'Caerphilly Chess Club', venue: 'Twyn Community Centre', address: 'Caerphilly, CF83 1JL', night: 'Mon', captain: 'Martin Jones', phone: '07412 419825', email: 'martin_jones8@sky.com' },
  { name: 'Phoenix', club: 'Pontypridd Chess Club', venue: 'Hopkinstown Cricket Club', address: '41 Hopkinstown Road, Pontypridd, CF37 2PR', night: 'Mon/Thu', captain: 'Daniel Wilmot', phone: '07502 207135', email: 'dwilmot96@hotmail.com' },
  { name: 'Bridgend A', club: 'Bridgend Chess Club', venue: 'Hope Baptist Church', address: 'Station Hill, Bridgend, CF31 1EA', night: 'Tue', captain: 'Mark Jones', phone: '07895 701782', email: 'marcwgjones@gmail.com' },
  // Centurians are in Division 1 but on neither the captains page nor the club-secretaries page,
  // so their venue and captain are unknown. Their fixtures load with the rest; fill these in later.
  { name: 'Centurians', club: '', venue: '', address: '', night: '', captain: '', phone: '', email: '', notes: 'Club and captain not listed by EGCA' },
]

/** All 18 Crows fixtures, in round order. Home matches are Wednesdays at Cardiff Chess Club. */
export const EGCA_FIXTURES: EgcaFixture[] = [
  { round: 1, date: '2026-09-02', opponentTeam: 'Castles', home: true },
  { round: 2, date: '2026-09-16', opponentTeam: 'Bishops', home: true },
  { round: 3, date: '2026-09-21', opponentTeam: 'Phoenix', home: false },
  { round: 4, date: '2026-10-28', opponentTeam: 'Celts', home: true },
  { round: 5, date: '2026-11-10', opponentTeam: 'Woodpushers', home: false },
  { round: 6, date: '2026-11-18', opponentTeam: 'Dragons', home: true },
  { round: 7, date: '2026-12-01', opponentTeam: 'Cheetahs', home: false },
  { round: 8, date: '2026-12-09', opponentTeam: 'Centurians', home: true },
  { round: 9, date: '2027-01-12', opponentTeam: 'Bridgend A', home: false },
  { round: 10, date: '2027-01-27', opponentTeam: 'Castles', home: false },
  { round: 11, date: '2027-02-10', opponentTeam: 'Bishops', home: false },
  { round: 12, date: '2027-02-17', opponentTeam: 'Phoenix', home: true },
  { round: 13, date: '2027-03-15', opponentTeam: 'Celts', home: false },
  { round: 14, date: '2027-03-10', opponentTeam: 'Woodpushers', home: true },
  { round: 15, date: '2027-03-31', opponentTeam: 'Dragons', home: false },
  { round: 16, date: '2027-04-21', opponentTeam: 'Cheetahs', home: true },
  { round: 17, date: '2027-04-26', opponentTeam: 'Centurians', home: false },
  { round: 18, date: '2027-05-19', opponentTeam: 'Bridgend A', home: true },
]
