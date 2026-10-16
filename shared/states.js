// Which state each city in shared/taxonomy.js belongs to, so a filter for a state
// ("Rajasthan") also finds people in its cities (Jaipur, Sikar, Kota, Jodhpur…).
// Plain data, no imports, so the website and the server can both load it.

export const STATE_CITIES = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vizag', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Anantapur', 'Kakinada', 'Rajahmundry', 'Tirupati'],
  'Arunachal Pradesh': ['Itanagar'],
  Assam: ['Guwahati', 'Dibrugarh', 'Silchar'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur'],
  Goa: ['Panaji'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Baroda', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Vapi'],
  Haryana: ['Gurugram', 'Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  Karnataka: ['Bengaluru', 'Bangalore', 'Mysuru', 'Mysore', 'Mangaluru', 'Mangalore', 'Hubballi', 'Belagavi', 'Bellary', 'Davanagere', 'Gulbarga', 'Hosur', 'Manipal', 'Udupi'],
  Kerala: ['Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Dewas', 'Ratlam'],
  Maharashtra: ['Mumbai', 'Bombay', 'Navi Mumbai', 'Thane', 'Kalyan', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Ahmednagar', 'Akola', 'Amravati', 'Dhule', 'Jalgaon', 'Kolhapur', 'Latur', 'Nanded', 'Sangli', 'Satara', 'Solapur'],
  Manipur: ['Imphal'],
  Meghalaya: ['Shillong'],
  Mizoram: ['Aizawl'],
  Nagaland: ['Kohima'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali', 'Zirakpur'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Alwar', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bhiwadi', 'Bikaner', 'Chittorgarh', 'Churu', 'Jaisalmer', 'Jhunjhunu', 'Kishangarh', 'Sikar', 'Sri Ganganagar'],
  Sikkim: ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Madras', 'Coimbatore', 'Madurai', 'Salem', 'Erode', 'Dindigul', 'Ooty', 'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Hosur'],
  Telangana: ['Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad'],
  Tripura: ['Agartala'],
  'Uttar Pradesh': ['Lucknow', 'Noida', 'Greater Noida', 'Ghaziabad', 'Kanpur', 'Agra', 'Aligarh', 'Allahabad', 'Prayagraj', 'Bareilly', 'Gorakhpur', 'Jhansi', 'Mathura', 'Meerut', 'Moradabad', 'Saharanpur', 'Varanasi'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Haldwani', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Calcutta', 'Howrah', 'Asansol', 'Durgapur', 'Kharagpur', 'Siliguri', 'Darjeeling'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Chandigarh UT': ['Chandigarh'],
  'Delhi NCR': ['Delhi', 'New Delhi', 'Noida', 'Greater Noida', 'Gurugram', 'Gurgaon', 'Ghaziabad', 'Faridabad'],
  'Jammu and Kashmir': ['Jammu', 'Srinagar'],
  Puducherry: ['Pondicherry'],
};

// "rajasthan" -> 'Rajasthan' (the state's key), or null when it isn't a state.
export function stateKey(value) {
  const v = String(value || '').trim().toLowerCase();
  return Object.keys(STATE_CITIES).find((s) => s.toLowerCase() === v || s.toLowerCase().replace(/ (ut|ncr)$/, '') === v) || null;
}
