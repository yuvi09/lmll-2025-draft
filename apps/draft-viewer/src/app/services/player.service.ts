import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

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
  Comments: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  constructor(private http: HttpClient) {}

  getPlayers(): Observable<Player[]> {
    console.log('Attempting to load players from:', '/assets/data/player_ratings.json');
    return this.http.get<RawPlayer[]>('/assets/data/player_ratings.json').pipe(
      tap(data => console.log('Received player data:', data)),
      map(players => players
        .filter(p => p.Name !== null) // Filter out null entries
        .map(p => ({
          grade: p.Grd,
          name: p.Name,
          age: p.Age,
          rating: parseFloat(p.Ratg),
          lastYearDivision: p["PY Division"],
          positions: p.Pos ? p.Pos.split(',') : [],
          Comments: p.Comments
        })))
    );
  }

  getRecentPlayers(): Observable<Player[]> {
    return this.getPlayers().pipe(
      map(players => players.slice(0, 12))
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