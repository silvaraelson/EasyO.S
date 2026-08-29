import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { CustomersListPage } from "./pages/customers/CustomersListPage";
import { CustomerNewPage } from "./pages/customers/CustomerNewPage";
import { CustomerDetailPage } from "./pages/customers/CustomerDetailPage";
import { ServiceOrdersListPage } from "./pages/service-orders/ServiceOrdersListPage";
import { ServiceOrderNewPage } from "./pages/service-orders/ServiceOrderNewPage";
import { ServiceOrderDetailPage } from "./pages/service-orders/ServiceOrderDetailPage";
import { ServiceTypesPage } from "./pages/service-types/ServiceTypesPage";
import { MaterialsPage } from "./pages/materials/MaterialsPage";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/indicadores" replace />} />
          <Route path="/indicadores" element={<DashboardPage />} />
          <Route path="/clientes" element={<CustomersListPage />} />
          <Route path="/clientes/novo" element={<CustomerNewPage />} />
          <Route path="/clientes/:id" element={<CustomerDetailPage />} />
          <Route path="/ordens-de-servico" element={<ServiceOrdersListPage />} />
          <Route path="/ordens-de-servico/nova" element={<ServiceOrderNewPage />} />
          <Route path="/ordens-de-servico/:id" element={<ServiceOrderDetailPage />} />
          <Route path="/tipos-de-servico" element={<ServiceTypesPage />} />
          <Route path="/materiais" element={<MaterialsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
