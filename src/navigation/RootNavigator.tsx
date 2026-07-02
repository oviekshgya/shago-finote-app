/**
 * Root Navigator
 * Bottom tab navigation untuk main screens
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, Text, View } from 'react-native';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import BillsScreen from '../screens/BillsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import {colors, shadow} from '../theme/finoteTheme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Icon components (simple text-based for now, can be replaced with icons)
function TabIcon({name, focused}: {name: string; focused: boolean}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>{name}</Text>
    </View>
  );
}

/**
 * Dashboard Stack Navigator
 */
function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
        },
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Transactions Stack Navigator
 */
function TransactionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
        },
      }}>
      <Stack.Screen
        name="TransactionsList"
        component={TransactionsScreen}
        options={{
          title: 'Transaksi',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{
          title: 'Detail Transaksi',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Add Transaction Stack Navigator
 */
function AddStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.ink,
      }}>
      <Stack.Screen
        name="AddMain"
        component={AddTransactionScreen}
        options={{
          title: 'Tambah Transaksi',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Bills Stack Navigator
 */
function BillsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.ink,
      }}>
      <Stack.Screen
        name="BillsMain"
        component={BillsScreen}
        options={{
          title: 'Tagihan',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Settings Stack Navigator
 */
function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.ink,
      }}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Pengaturan',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Root Navigator Component
 */
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={() => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tab,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 66,
            paddingBottom: 9,
            paddingTop: 7,
            ...shadow,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginBottom: 4,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.faint,
          tabBarShowLabel: true,
        })}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardStack}
          options={{
            title: 'Dashboard',
            tabBarLabel: 'Home',
            tabBarIcon: ({focused}) => <TabIcon name="⌂" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Transactions"
          component={TransactionsStack}
          options={{
            title: 'Transaksi',
            tabBarLabel: 'Insights',
            tabBarIcon: ({focused}) => <TabIcon name="⌁" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Add"
          component={AddStack}
          options={{
            title: 'Tambah',
            tabBarLabel: '',
            tabBarShowLabel: false,
            tabBarIcon: ({focused}) => (
              <View
                style={[
                  styles.addButtonCircle,
                  focused && styles.addButtonCircleActive,
                ]}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Bills"
          component={BillsStack}
          options={{
            title: 'Tagihan',
            tabBarLabel: 'Goals',
            tabBarIcon: ({focused}) => <TabIcon name="◎" focused={focused} />,
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsStack}
          options={{
            title: 'Pengaturan',
            tabBarLabel: 'Help',
            tabBarIcon: ({focused}) => <TabIcon name="?" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
  },
  tabIconText: {
    fontSize: 19,
    color: colors.faint,
    fontWeight: '900',
  },
  tabIconTextActive: {
    fontSize: 20,
    color: colors.primary,
  },
  addButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonCircleActive: {
    backgroundColor: colors.primaryDark,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.surface,
  },
});
