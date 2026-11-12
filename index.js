// Background tasks must be defined before the app loads, so they also exist when Android starts
// the app in the background just to run one (for example a reminder button press).
import './lib/notifications/background-actions';
import './lib/notifications/upkeep';

import 'expo-router/entry';
