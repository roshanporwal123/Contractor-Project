// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CompanyPage from "./pages/company/CompanyPage";
import ContractorList from "./pages/contractors/ContractorList";
import ContractorForm from "./pages/contractors/ContractorForm";
import ContractorProfile from "./pages/contractors/ContractorProfile";
import Projects from "./pages/Projects";
import ProjectForm  from "./pages/ProjectForm";
import ProjectDetail from "./pages/ProjectDetail";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import TimeTracking from "./pages/TimeTracking";
import EstimateList from "./pages/estimates/EstimateList";
import EstimateForm from "./pages/estimates/EstimateForm";
import PublicEstimate from "./pages/estimates/PublicEstimate";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payments from "./pages/Payments";
import Payouts from "./pages/Payouts";
import Materials from "./pages/Materials";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import CalendarPage from "./pages/CalendarPage";
import Dashboard1 from "./pages/Dashboard1";
import Reviews from "./pages/Reviews";
import { NotificationProvider } from "./context/NotificationContext";
import Notifications from "./pages/Notifications";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import ResourceManager from "./pages/admin/ResourceManager";

function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/company" 
            element={
              <ProtectedRoute>
                <CompanyPage />
              </ProtectedRoute>
            }
          />
          <Route path="/contractors" 
          element={
            <ProtectedRoute>
               <ContractorList />
            </ProtectedRoute>
          }
          />
          <Route path="/contractors/new" 
          element={
            <ProtectedRoute>
               <ContractorForm />
            </ProtectedRoute>
          }
          />
          <Route path="/contractors/:id" 
          element={
            <ProtectedRoute>
               <ContractorProfile />
            </ProtectedRoute>
          }
          />
          <Route path="/contractors/:id/edit" 
          element={
            <ProtectedRoute>
               <ContractorForm />
            </ProtectedRoute>
          }
          />
          <Route path="/projects" 
          element={
          <ProtectedRoute>
              <Projects />
          </ProtectedRoute>
          }
          />
          <Route path="/projects/new" 
          element={
          <ProtectedRoute>
              <ProjectForm />
          </ProtectedRoute>
          }
          />
          <Route path="/projects/:id" 
          element={
          <ProtectedRoute>
              <ProjectDetail />
          </ProtectedRoute>
          }
          />
          <Route path="/projects/:id/edit" 
          element={
          <ProtectedRoute>
              <ProjectForm />
          </ProtectedRoute>
          }
          />
          <Route path="/tasks" 
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
          />
          <Route path="/tasks/:id" 
          element={
            <ProtectedRoute>
              <TaskDetail />
            </ProtectedRoute>
          }
          />
          <Route path="/time-tracking"
          element={
            <ProtectedRoute>
              <TimeTracking />
            </ProtectedRoute>
          }
          />
          <Route path="/estimate/:token" element={<PublicEstimate />} />

          <Route path="/estimates" element={<EstimateList />} />
          <Route path="/estimates/new" element={<EstimateForm />} />
          <Route path="/estimates/:id/edit" element={<EstimateForm />} />

          <Route path="/invoices" 
          element={
          <ProtectedRoute>
              <Invoices />
          </ProtectedRoute>
          }
          />
          <Route path="/invoices/new" 
          element={
          <ProtectedRoute>
              <InvoiceForm />
          </ProtectedRoute>
          }
          />
          <Route path="/invoices/:id" 
          element={
          <ProtectedRoute>
              <InvoiceDetail />
          </ProtectedRoute>
          }
          />
          <Route path="/invoices/:id/edit" 
          element={
          <ProtectedRoute>
              <InvoiceForm />
          </ProtectedRoute>
          }
          />
          <Route path="/payments" 
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
          />
          <Route path="/payouts"
          element={
            <ProtectedRoute>
              <Payouts />
            </ProtectedRoute>
          }
          />
          <Route path="/materials" 
          element={
            <ProtectedRoute>
              <Materials />
            </ProtectedRoute>
          }
          />
          <Route path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
          />
          <Route path="/chat" 
          element={
            <ProtectedRoute>
               <Chat />
            </ProtectedRoute>
          }
          />
          <Route path="/calendar" 
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
          />
          <Route path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard1 />
            </ProtectedRoute>
          }
          />
          <Route path="/reviews" 
          element={
            <ProtectedRoute>
               <Reviews />
            </ProtectedRoute>
          }
          />
          <Route path="/" element={ <Navigate to="/login" />} />
          <Route path="/register" element={<Register />} />
          <Route path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
          />
          <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path=":resource" element={<ResourceManager />} />
         </Route>
        </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
