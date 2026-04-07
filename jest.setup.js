// Jest setup for React Native

// Reanimated mock must be set up before importing components that use it
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');

  // The mock uses `call` which is deprecated and may not exist in newer versions
  Reanimated.default.call = () => {};

  return Reanimated;
});

// Worklet init stub (required by some versions of reanimated)
// @ts-ignore
global.__reanimatedWorkletInit = () => {};

// AsyncStorage native module mock
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Expo vector icons pull in expo-font/expo-modules-core which relies on native bindings.
// For unit tests we can safely mock icons to simple Text components.
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Text } = require('react-native');

  const MockIcon = (props) => React.createElement(Text, props, 'Icon');

  return {
    Ionicons: MockIcon,
  };
});

// React Navigation can schedule timers/animations which may run after tests finish.
// For unit tests, mock it to a minimal implementation.
jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');

  return {
    NavigationContainer: ({ children }) => React.createElement(React.Fragment, null, children),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: () => {},
  };
});

jest.mock('@react-navigation/stack', () => {
  return {
    createStackNavigator: () => {
      const Null = () => null;
      return {
        Navigator: Null,
        Screen: Null,
      };
    },
  };
});

// Native date picker ships ESM; mock it for unit tests.
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View } = require('react-native');

  const MockDateTimePicker = (props) => React.createElement(View, props, null);
  return MockDateTimePicker;
});
