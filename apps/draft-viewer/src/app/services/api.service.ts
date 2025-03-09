import axios from 'axios';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';

const API_URL = 'http://localhost:3333';

export interface Player {
  id: number;
  name: string;
  grade: number;
  batting: number;
  pitching: number;
  fielding: number;
  overall: number;
  draft_number: number;
  position?: string;
  mc_batting?: number;
  mc_fielding?: number;
  mc_pitching?: number;
  mc_overall?: number;
  yd_batting?: number;
  yd_fielding?: number;
  yd_pitching?: number;
  age?: number;
  py_division?: string;
  rating?: string;
  notes?: string;
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

export interface PickOrder {
  pick_number: number;
  team_number: number;
  managers: string;
}

export interface IneligiblePlayer {
  Grade: number;
  "Draft Number": number;
  Name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Player API calls
  async getPlayers(): Promise<Player[]> {
    const response = await axios.get(`${API_URL}/players`);
    return response.data;
  }

  async getTopPlayersByGrade(grade: number, limit: number = 10): Promise<Player[]> {
    const response = await axios.get(`${API_URL}/players/top/${grade}/${limit}`);
    return response.data;
  }

  // Team API calls
  async getTeams(): Promise<Team[]> {
    const response = await axios.get(`${API_URL}/teams`);
    return response.data;
  }

  // Pick API calls
  async getPicks(): Promise<Pick[]> {
    const response = await axios.get(`${API_URL}/picks`);
    return response.data;
  }

  async getTeamPicks(teamId: number): Promise<Pick[]> {
    const response = await axios.get(`${API_URL}/picks/team/${teamId}`);
    return response.data;
  }

  async addPick(
    playerId: number, 
    teamNumber: number,
    round: number, 
    pickNumber: number
  ): Promise<Pick> {
    const response = await axios.post(`${API_URL}/picks`, {
      player_id: playerId,
      team_number: teamNumber,
      round,
      pick_number: pickNumber
    });
    return response.data;
  }

  async clearPicks(): Promise<void> {
    await axios.delete(`${API_URL}/picks`);
  }

  async getDraftState(): Promise<DraftState> {
    const response = await axios.get(`${API_URL}/draft-state`);
    return response.data;
  }

  async updateDraftState(state: DraftState): Promise<DraftState> {
    const response = await axios.put(`${API_URL}/draft-state`, state);
    return response.data;
  }

  async getPickOrder(): Promise<PickOrder[]> {
    const response = await axios.get(`${API_URL}/pick-order`);
    return response.data;
  }

  async getIneligiblePlayers(): Promise<IneligiblePlayer[]> {
    try {
      return await lastValueFrom(
        this.http.get<IneligiblePlayer[]>('/assets/data/ineligible_players.json')
      );
    } catch (err) {
      console.error('Error loading ineligible players:', err);
      return []; // Return empty array as fallback
    }
  }
} 