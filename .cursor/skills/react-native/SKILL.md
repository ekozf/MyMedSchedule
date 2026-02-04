You are an expert in TypeScript, React Native, Expo, and Mobile UI development. You use bun.

Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes unless necessary.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Follow Expo's official documentation for setting up and configuring your projects: https://docs.expo.dev/

Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Use strict mode in TypeScript for better type safety.

Syntax and Formatting

- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.

UI and Styling

- Use Expo's built-in or React Native Reusables (https://reactnativereusables.com/docs) components for common UI patterns and layouts.
- Implement responsive design with Flexbox and Expo's useWindowDimensions for screen size adjustments.
- Use styled-components or Nativewind / Tailwind CSS (https://www.nativewind.dev/docs) for component styling.
- Implement dark mode support using Expo's useColorScheme.
- Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.
- Leverage react-native-reanimated and react-native-gesture-handler for performant animations and gestures.

Safe Area Management

- Use SafeAreaProvider from react-native-safe-area-context to manage safe areas globally in your app (wrap the root component).
- Use the useSafeAreaInsets hook to get safe area insets and apply them dynamically to your components.
- For headers, apply top insets with style={{ paddingTop: insets.top + extraPadding }}.
- For ScrollViews, use contentContainerStyle={{ paddingBottom: insets.bottom + extraPadding }} to ensure content is accessible.
- Optionally use SafeAreaView component for simple cases where you want automatic padding/margin applied to all edges.
- Avoid hardcoding padding or margins for safe areas; always use useSafeAreaInsets or SafeAreaView to ensure proper spacing on all devices.

Performance Optimization

- Minimize the use of useState and useEffect; prefer context and reducers for state management.
- Use Expo's AppLoading and SplashScreen for optimized app startup experience.
- Optimize images: use WebP format where supported, include size data, implement lazy loading with expo-image.
- Implement code splitting and lazy loading for non-critical components with React's Suspense and dynamic imports.
- Profile and monitor performance using React Native's built-in tools and Expo's debugging features.
- Avoid unnecessary re-renders by memoizing components and using useMemo and useCallback hooks appropriately.

Navigation

- Use react-navigation for routing and navigation; follow its best practices for stack, tab, and drawer navigators.
- Leverage deep linking and universal links for better user engagement and navigation flow.
- Use dynamic routes with expo-router for better navigation handling.

State Management

- Use React Context and useReducer for managing global state.
- Leverage react-query for data fetching and caching; avoid excessive API calls.
- For complex state management, consider using Zustand.
- Handle URL search parameters using libraries like expo-linking.

Error Handling and Validation

- Use Zod for runtime validation and error handling.
- Prioritize error handling and edge cases:
  - Handle errors at the beginning of functions.
  - Use early returns for error conditions to avoid deeply nested if statements.
  - Avoid unnecessary else statements; use if-return pattern instead.
  - Implement global error boundaries to catch and handle unexpected errors.

Security

- Sanitize user inputs to prevent XSS attacks.
- Use react-native-encrypted-storage for secure storage of sensitive data.
- Ensure secure communication with APIs using HTTPS and proper authentication.
- Use Expo's Security guidelines to protect your app: https://docs.expo.dev/guides/security/

Internationalization (i18n)

- Use react-native-i18n or expo-localization for internationalization and localization.
- Support multiple languages.
- Ensure text scaling and font adjustments for accessibility.

Key Conventions

1. Rely on Expo's managed workflow for streamlined development and deployment.
2. Prioritize Mobile Web Vitals (Load Time, Jank, and Responsiveness).
3. Use expo-constants for managing environment variables and configuration.
4. Use expo-permissions to handle device permissions gracefully.
5. Implement expo-updates for over-the-air (OTA) updates.
6. Follow Expo's best practices for app deployment and publishing: https://docs.expo.dev/distribution/introduction/
7. Ensure compatibility with iOS and Android by testing extensively on both platforms.

API Documentation

- Use Expo's official documentation for setting up and configuring your projects: https://docs.expo.dev/

Refer to Expo's, React Native Reusables', Nativewind's documentations for detailed information on Views, Blueprints, Extensions, Components, and Styling for best practices.
