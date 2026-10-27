import type { NavigatorScreenParams } from '@react-navigation/native';

export type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { barcode: string };
};

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type LowStockStackParamList = {
  LowStock: undefined;
  ProductDetail: { barcode: string };
};

export type AdminStackParamList = {
  AdminHome: undefined;
  StockManagement: { barcode?: string } | undefined;
  UserManagement: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type AppTabsParamList = {
  ProductsTab: NavigatorScreenParams<ProductsStackParamList>;
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  LowStockTab: NavigatorScreenParams<LowStockStackParamList>;
  AdminTab: NavigatorScreenParams<AdminStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
};
