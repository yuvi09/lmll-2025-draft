import { Route } from '@angular/router';
import { PlayerListComponent } from './player-list/player-list.component';

export const routes: Route[] = [
    { path: '', redirectTo: 'player-list', pathMatch: 'full' },
    { path: 'player-list', component: PlayerListComponent },
    { path: 'team-selected', component: PlayerListComponent },
    { path: 'top-batters', component: PlayerListComponent },
    { path: 'top-pitchers', component: PlayerListComponent },
    { path: 'second-grade', component: PlayerListComponent },
    { path: 'third-grade', component: PlayerListComponent }
];
