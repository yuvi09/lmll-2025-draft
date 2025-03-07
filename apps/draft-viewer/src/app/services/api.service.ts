import axios from 'axios';

const API_URL = 'http://localhost:3333';

export interface Player {
  id: number;
  name: string;
  grade: number;
  batting: number;
  pitching: number;
  fielding: number;
  overall: number;
  position?: string;
  age?: number;
  rating?: string;
  lastYearDivision?: string;
  positions?: string[];
  Comments?: string;
}

export interface Team {
  id: number;
  team_number: number;
  name: string;
  managers: string;
}

export interface Pick {
  id: number;
  player_id: number;
  team_id: number;
  round: number;
  pick_number: number;
  timestamp: string;
  player_name: string;
  grade: number;
  overall: number;
  team_number: number;
  team_name: string;
  team_managers: string;
}

export interface DraftState {
  current_round: number;
  current_pick_index: number;
}

// Player API calls
export const getPlayers = async (): Promise<Player[]> => {
  const response = await axios.get(`${API_URL}/players`);
  return response.data;
};

export const getTopPlayersByGrade = async (grade: number, limit: number = 10): Promise<Player[]> => {
  const response = await axios.get(`${API_URL}/players/top/${grade}/${limit}`);
  return response.data;
};

// Team API calls
export const getTeams = async (): Promise<Team[]> => {
  const response = await axios.get(`${API_URL}/teams`);
  return response.data;
};

// Pick API calls
export const getPicks = async (): Promise<Pick[]> => {
  const response = await axios.get(`${API_URL}/picks`);
  return response.data;
};

export const getTeamPicks = async (teamId: number): Promise<Pick[]> => {
  const response = await axios.get(`${API_URL}/picks/team/${teamId}`);
  return response.data;
};

export const addPick = async (
  playerId: number, 
  teamNumber: number,
  round: number, 
  pickNumber: number
): Promise<Pick> => {
  const response = await axios.post(`${API_URL}/picks`, {
    player_id: playerId,
    team_number: teamNumber,
    round,
    pick_number: pickNumber
  });
  return response.data;
};

export const clearPicks = async (): Promise<void> => {
  await axios.delete(`${API_URL}/picks`);
};

export const getDraftState = async (): Promise<DraftState> => {
  const response = await axios.get(`${API_URL}/draft-state`);
  return response.data;
};

export const updateDraftState = async (state: DraftState): Promise<DraftState> => {
  const response = await axios.put(`${API_URL}/draft-state`, state);
  return response.data;
}; 