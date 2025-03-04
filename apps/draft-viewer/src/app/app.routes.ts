import { Route } from '@angular/router';
import { PlayerListComponent } from './player-list/player-list.component';

export const appRoutes: Route[] = [
    {
        path: '',
        component: PlayerListComponent
    },
    {
        path: 'player-list',
        component: PlayerListComponent
    }
];
