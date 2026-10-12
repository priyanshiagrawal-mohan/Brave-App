// City suggestions for the lead form. Students can still type a city that isn't listed.
// [city, state or country]

export const CITIES: [string, string][] = [
  // India: metros and state capitals first, then major cities by region
  ['New Delhi', 'Delhi'], ['Mumbai', 'Maharashtra'], ['Bengaluru', 'Karnataka'], ['Hyderabad', 'Telangana'], ['Chennai', 'Tamil Nadu'],
  ['Kolkata', 'West Bengal'], ['Pune', 'Maharashtra'], ['Ahmedabad', 'Gujarat'], ['Jaipur', 'Rajasthan'], ['Lucknow', 'Uttar Pradesh'],
  ['Chandigarh', 'Chandigarh'], ['Bhopal', 'Madhya Pradesh'], ['Patna', 'Bihar'], ['Bhubaneswar', 'Odisha'], ['Thiruvananthapuram', 'Kerala'],
  ['Kochi', 'Kerala'], ['Guwahati', 'Assam'], ['Dehradun', 'Uttarakhand'], ['Ranchi', 'Jharkhand'], ['Raipur', 'Chhattisgarh'],
  ['Shimla', 'Himachal Pradesh'], ['Srinagar', 'Jammu and Kashmir'], ['Jammu', 'Jammu and Kashmir'], ['Panaji', 'Goa'], ['Gandhinagar', 'Gujarat'],
  ['Amaravati', 'Andhra Pradesh'], ['Visakhapatnam', 'Andhra Pradesh'], ['Vijayawada', 'Andhra Pradesh'], ['Imphal', 'Manipur'], ['Shillong', 'Meghalaya'],
  ['Aizawl', 'Mizoram'], ['Kohima', 'Nagaland'], ['Agartala', 'Tripura'], ['Itanagar', 'Arunachal Pradesh'], ['Gangtok', 'Sikkim'],
  ['Puducherry', 'Puducherry'], ['Port Blair', 'Andaman and Nicobar'], ['Leh', 'Ladakh'],
  // NCR
  ['Gurugram', 'Haryana'], ['Noida', 'Uttar Pradesh'], ['Greater Noida', 'Uttar Pradesh'], ['Ghaziabad', 'Uttar Pradesh'], ['Faridabad', 'Haryana'],
  // North
  ['Kanpur', 'Uttar Pradesh'], ['Agra', 'Uttar Pradesh'], ['Varanasi', 'Uttar Pradesh'], ['Prayagraj', 'Uttar Pradesh'], ['Meerut', 'Uttar Pradesh'],
  ['Bareilly', 'Uttar Pradesh'], ['Aligarh', 'Uttar Pradesh'], ['Gorakhpur', 'Uttar Pradesh'], ['Moradabad', 'Uttar Pradesh'], ['Mathura', 'Uttar Pradesh'],
  ['Ludhiana', 'Punjab'], ['Amritsar', 'Punjab'], ['Jalandhar', 'Punjab'], ['Patiala', 'Punjab'], ['Mohali', 'Punjab'],
  ['Panipat', 'Haryana'], ['Ambala', 'Haryana'], ['Karnal', 'Haryana'], ['Rohtak', 'Haryana'], ['Hisar', 'Haryana'], ['Sonipat', 'Haryana'],
  ['Haridwar', 'Uttarakhand'], ['Rishikesh', 'Uttarakhand'], ['Haldwani', 'Uttarakhand'], ['Dharamshala', 'Himachal Pradesh'],
  ['Jodhpur', 'Rajasthan'], ['Udaipur', 'Rajasthan'], ['Kota', 'Rajasthan'], ['Ajmer', 'Rajasthan'], ['Bikaner', 'Rajasthan'], ['Alwar', 'Rajasthan'],
  // West
  ['Nagpur', 'Maharashtra'], ['Nashik', 'Maharashtra'], ['Thane', 'Maharashtra'], ['Navi Mumbai', 'Maharashtra'], ['Aurangabad', 'Maharashtra'],
  ['Solapur', 'Maharashtra'], ['Kolhapur', 'Maharashtra'], ['Amravati', 'Maharashtra'], ['Sangli', 'Maharashtra'],
  ['Surat', 'Gujarat'], ['Vadodara', 'Gujarat'], ['Rajkot', 'Gujarat'], ['Bhavnagar', 'Gujarat'], ['Jamnagar', 'Gujarat'], ['Anand', 'Gujarat'],
  ['Margao', 'Goa'], ['Vasco da Gama', 'Goa'],
  // Central
  ['Indore', 'Madhya Pradesh'], ['Jabalpur', 'Madhya Pradesh'], ['Gwalior', 'Madhya Pradesh'], ['Ujjain', 'Madhya Pradesh'], ['Sagar', 'Madhya Pradesh'],
  ['Bilaspur', 'Chhattisgarh'], ['Durg', 'Chhattisgarh'], ['Bhilai', 'Chhattisgarh'],
  // East and North-East
  ['Jamshedpur', 'Jharkhand'], ['Dhanbad', 'Jharkhand'], ['Bokaro', 'Jharkhand'], ['Gaya', 'Bihar'], ['Bhagalpur', 'Bihar'], ['Muzaffarpur', 'Bihar'],
  ['Cuttack', 'Odisha'], ['Rourkela', 'Odisha'], ['Berhampur', 'Odisha'], ['Howrah', 'West Bengal'], ['Durgapur', 'West Bengal'], ['Asansol', 'West Bengal'],
  ['Siliguri', 'West Bengal'], ['Dibrugarh', 'Assam'], ['Silchar', 'Assam'], ['Jorhat', 'Assam'],
  // South
  ['Mysuru', 'Karnataka'], ['Mangaluru', 'Karnataka'], ['Hubballi', 'Karnataka'], ['Belagavi', 'Karnataka'], ['Davanagere', 'Karnataka'], ['Udupi', 'Karnataka'],
  ['Coimbatore', 'Tamil Nadu'], ['Madurai', 'Tamil Nadu'], ['Tiruchirappalli', 'Tamil Nadu'], ['Salem', 'Tamil Nadu'], ['Tirunelveli', 'Tamil Nadu'],
  ['Vellore', 'Tamil Nadu'], ['Erode', 'Tamil Nadu'], ['Tiruppur', 'Tamil Nadu'], ['Thanjavur', 'Tamil Nadu'],
  ['Kozhikode', 'Kerala'], ['Thrissur', 'Kerala'], ['Kollam', 'Kerala'], ['Kannur', 'Kerala'], ['Alappuzha', 'Kerala'], ['Kottayam', 'Kerala'],
  ['Warangal', 'Telangana'], ['Karimnagar', 'Telangana'], ['Nizamabad', 'Telangana'], ['Khammam', 'Telangana'],
  ['Guntur', 'Andhra Pradesh'], ['Nellore', 'Andhra Pradesh'], ['Tirupati', 'Andhra Pradesh'], ['Kurnool', 'Andhra Pradesh'], ['Kakinada', 'Andhra Pradesh'],
  ['Rajahmundry', 'Andhra Pradesh'], ['Anantapur', 'Andhra Pradesh'],
  // Outside India
  ['Dubai', 'United Arab Emirates'], ['Abu Dhabi', 'United Arab Emirates'], ['Sharjah', 'United Arab Emirates'], ['Doha', 'Qatar'], ['Muscat', 'Oman'],
  ['Riyadh', 'Saudi Arabia'], ['Jeddah', 'Saudi Arabia'], ['Kuwait City', 'Kuwait'], ['Manama', 'Bahrain'],
  ['Singapore', 'Singapore'], ['Kuala Lumpur', 'Malaysia'], ['Bangkok', 'Thailand'], ['Jakarta', 'Indonesia'], ['Hong Kong', 'Hong Kong'],
  ['Tokyo', 'Japan'], ['Seoul', 'South Korea'], ['Shanghai', 'China'], ['Beijing', 'China'],
  ['Kathmandu', 'Nepal'], ['Dhaka', 'Bangladesh'], ['Colombo', 'Sri Lanka'], ['Thimphu', 'Bhutan'], ['Malé', 'Maldives'],
  ['London', 'United Kingdom'], ['Manchester', 'United Kingdom'], ['Birmingham', 'United Kingdom'], ['Leicester', 'United Kingdom'],
  ['Dublin', 'Ireland'], ['Paris', 'France'], ['Berlin', 'Germany'], ['Frankfurt', 'Germany'], ['Munich', 'Germany'], ['Amsterdam', 'Netherlands'],
  ['Zurich', 'Switzerland'], ['Stockholm', 'Sweden'],
  ['New York', 'United States'], ['San Francisco', 'United States'], ['San Jose', 'United States'], ['Seattle', 'United States'],
  ['Chicago', 'United States'], ['Dallas', 'United States'], ['Houston', 'United States'], ['Boston', 'United States'], ['New Jersey', 'United States'],
  ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['Brampton', 'Canada'], ['Sydney', 'Australia'], ['Melbourne', 'Australia'], ['Perth', 'Australia'],
  ['Auckland', 'New Zealand'], ['Nairobi', 'Kenya'], ['Johannesburg', 'South Africa'],
]

/** Older or common names people type, so "Bangalore" finds Bengaluru. */
const ALIASES: Record<string, string[]> = {
  Bengaluru: ['Bangalore'], Mumbai: ['Bombay'], Chennai: ['Madras'], Kolkata: ['Calcutta'], Gurugram: ['Gurgaon'],
  Mysuru: ['Mysore'], Mangaluru: ['Mangalore'], Prayagraj: ['Allahabad'], Thiruvananthapuram: ['Trivandrum'],
  Puducherry: ['Pondicherry'], Vadodara: ['Baroda'], Kochi: ['Cochin', 'Ernakulam'], Belagavi: ['Belgaum'],
  Hubballi: ['Hubli'], 'New Delhi': ['Delhi'], Tiruchirappalli: ['Trichy'], Varanasi: ['Banaras', 'Benares'],
  Kozhikode: ['Calicut'], Thrissur: ['Trichur'], Panaji: ['Panjim'], Aurangabad: ['Chhatrapati Sambhajinagar'],
}

/** Best matches for what's typed: names (or old names) starting with it first, then names containing it. */
export function matchCities(q: string, limit = 8): [string, string][] {
  const s = q.trim().toLowerCase()
  if (!s) return CITIES.slice(0, limit)
  const names = (c: string) => [c, ...(ALIASES[c] ?? [])].map((x) => x.toLowerCase())
  const starts = CITIES.filter(([c]) => names(c).some((n) => n.startsWith(s)))
  const has = CITIES.filter(([c, r]) => !starts.some(([x]) => x === c) && (names(c).some((n) => n.includes(s)) || r.toLowerCase().startsWith(s)))
  return [...starts, ...has].slice(0, limit)
}
