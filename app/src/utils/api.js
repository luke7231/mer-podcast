import axios from 'axios';
import { SERVER_URL } from '../constants';

export async function fetchEpisodes() {
  const { data } = await axios.get(`${SERVER_URL}/episodes`, { timeout: 10000 });
  return data;
}
