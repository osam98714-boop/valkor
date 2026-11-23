import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CartProvider } from "./contexts/CartContext";
import StorePages from "./pages/StorePages";
import AdminPages from "./pages/AdminPages";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/products" component={StorePages.Products} />
    <Route path="/communities" component={StorePages.Communities} />
    <Route path="/products/:slug" component={StorePages.Product} />
    <Route path="/categories/:slug" component={StorePages.Category} />
    <Route path="/cart" component={StorePages.Cart} />
    <Route path="/checkout" component={StorePages.Checkout} />
    <Route path="/order/:orderNo" component={StorePages.OrderConfirmation} />
    <Route path="/admin/login" component={AdminPages.Login} />
    <Route path="/admin/products/new" component={AdminPages.ProductEditor} />
    <Route path="/admin/products/:id" component={AdminPages.ProductEditor} />
    <Route path="/admin/products" component={AdminPages.Products} />
    <Route path="/admin/categories" component={AdminPages.Categories} />
    <Route path="/admin/orders/:id" component={AdminPages.OrderDetail} />
    <Route path="/admin/orders" component={AdminPages.Orders} />
    <Route path="/admin/customers" component={AdminPages.Customers} />
    <Route path="/admin/communities" component={AdminPages.Communities} />
    <Route path="/admin/currencies" component={AdminPages.Currencies} />
    <Route path="/admin/links" component={AdminPages.Links} />
    <Route path="/admin/theme" component={AdminPages.ThemeSettings} />
    <Route path="/admin/store" component={AdminPages.StoreSettings} />
    <Route path="/admin/admins" component={AdminPages.Admins} />
    <Route path="/admin/audit" component={AdminPages.Audit} />
    <Route path="/admin/settings" component={AdminPages.StoreSettings} />
    <Route path="/admin/maintenance" component={AdminPages.Maintenance} />
    <Route path="/admin" component={AdminPages.Dashboard} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="gold-light">
      <LanguageProvider defaultLanguage="ar">
        <CartProvider>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}
export default App;
