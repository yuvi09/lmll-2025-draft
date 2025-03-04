import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  grade: string;
  age: number;
  name: string;
  tryoutRating?: number;
  lastYearRating?: number;
  currentRating: number;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.scss'],
  imports: [CommonModule]
})
export class PlayerListComponent {
  recentPlayers: Player[] = [
    { grade: '3rd', age: 9, name: 'John Smith', tryoutRating: 8.5, lastYearRating: 7.8, currentRating: 8.5 },
    { grade: '3rd', age: 9, name: 'Emma Wilson', tryoutRating: 9.0, lastYearRating: 8.5, currentRating: 9.0 },
    { grade: '2nd', age: 8, name: 'Michael Brown', tryoutRating: 7.8, lastYearRating: 7.2, currentRating: 7.8 },
    { grade: '3rd', age: 9, name: 'Sarah Davis', tryoutRating: 8.7, lastYearRating: 8.0, currentRating: 8.7 },
    { grade: '2nd', age: 8, name: 'James Johnson', tryoutRating: 8.2, lastYearRating: 7.5, currentRating: 8.2 }
  ];

  thirdGradePlayers: Player[] = [
    { grade: '3rd', age: 9, name: 'Emma Wilson', currentRating: 9.0 },
    { grade: '3rd', age: 9, name: 'Sarah Davis', currentRating: 8.7 },
    { grade: '3rd', age: 9, name: 'John Smith', currentRating: 8.5 },
    { grade: '3rd', age: 9, name: 'Alex Turner', currentRating: 8.4 },
    { grade: '3rd', age: 9, name: 'Olivia Martinez', currentRating: 8.3 }
  ];

  secondGradePlayers: Player[] = [
    { grade: '2nd', age: 8, name: 'James Johnson', currentRating: 8.2 },
    { grade: '2nd', age: 8, name: 'Michael Brown', currentRating: 7.8 },
    { grade: '2nd', age: 8, name: 'Emily White', currentRating: 7.7 },
    { grade: '2nd', age: 8, name: 'Daniel Lee', currentRating: 7.6 },
    { grade: '2nd', age: 8, name: 'Sofia Garcia', currentRating: 7.5 }
  ];
}
