import { MapPin } from 'lucide-react';
import Autocomplete from './Autocomplete';
import { LOCATIONS } from '../lib/options';
import { searchLocations } from '../lib/suggestions';

// City/state box with Indian locations suggested as you type; any other text is allowed too.
export default function LocationInput({ value, onChange, placeholder = 'City, e.g. Jaipur', icon = MapPin }) {
  return <Autocomplete value={value} onChange={onChange} options={LOCATIONS} search={searchLocations} icon={icon} placeholder={placeholder} />;
}
