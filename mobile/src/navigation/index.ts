/**
 * Navigation exports
 *
 * Centralized exports for all navigation components and utilities
 *
 * @example
 * // Basic usage in App.tsx:
 * import { RootNavigator } from './navigation';
 * import { ThemeProvider } from './theme';
 *
 * export default function App() {
 *   const [isAuthenticated, setIsAuthenticated] = useState(false);
 *
 *   return (
 *     <ThemeProvider>
 *       <RootNavigator isAuthenticated={isAuthenticated} />
 *     </ThemeProvider>
 *   );
 * }
 *
 * @example
 * // Using deep links:
 * import { createDeepLink, shareSession } from './navigation';
 *
 * // Create a link to a specific event
 * const eventLink = createDeepLink.event('event-123');
 *
 * // Share a session
 * await shareSession('session-456');
 *
 * @example
 * // Navigation between screens:
 * import { useNavigation } from '@react-navigation/native';
 * import type { RootStackParamList } from './navigation';
 *
 * const navigation = useNavigation<NavigationProp<RootStackParamList>>();
 * navigation.navigate('EventEdit', { eventId: '123' });
 */

export { default as RootNavigator } from './RootNavigator';
export type { RootStackParamList } from './RootNavigator';

export { default as TabNavigator } from './TabNavigator';
export type { TabParamList } from './TabNavigator';

export { default as DrawerNavigator } from './DrawerNavigator';
export type { DrawerParamList } from './DrawerNavigator';

export { linking, createDeepLink, shareSession } from './linking';
