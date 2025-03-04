import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface RawPlayer {
  Grd: string;
  "D#": number;
  Name: string;
  Age: number;
  Batting: number | null;
  Fiedling: number | null;
  Throwing: number | null;
  "YD Notes": string | null;
  "PY Division": string | null;
  Ratg: string;
  Pos: string | null;
  Comments: string | null;
}

export interface Player {
  grade: string;
  name: string;
  age: number;
  rating: number;
  lastYearDivision: string | null;
  positions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  constructor(private http: HttpClient) {}

  getPlayers(): Observable<Player[]> {
    return this.http.get<RawPlayer[]>('assets/data/player_ratings.json').pipe(
      map(players => players.map(p => ({
        grade: p.Grd,
        name: p.Name,
        age: p.Age,
        rating: parseFloat(p.Ratg),
        lastYearDivision: p["PY Division"],
        positions: p.Pos ? p.Pos.split(',') : []
      })))
    );
  }

  getRecentPlayers(): Observable<Player[]> {
    return this.getPlayers().pipe(
      map(players => players.slice(0, 5))
    );
  }

  getTopThirdGraders(): Observable<Player[]> {
    return this.getPlayers().pipe(
      map(players => players
        .filter(p => p.grade === '3rd')
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
      )
    );
  }

  getTopSecondGraders(): Observable<Player[]> {
    return this.getPlayers().pipe(
      map(players => players
        .filter(p => p.grade === '2nd')
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
      )
    );
  }
} 