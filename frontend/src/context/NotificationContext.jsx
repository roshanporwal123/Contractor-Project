// import { createContext, useContext, useEffect, useState, useCallback } from "react";
// import api from "../api/axios";
// import { useAuth } from "./AuthContext";

// const NotificationContext = createContext(null);

// export const NotificationProvider = ({ children }) => {
//   const { user } = useAuth();
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [latest, setLatest] = useState([]);

//   const refresh = useCallback(async () => {
//     if (!user) return;
//     try {
//       const { data } = await api.get("/notifications?limit=6");
//       setLatest(data.notifications);
//       setUnreadCount(data.unreadCount);
//     } catch (err) {
//       console.error("notifications refresh failed", err);
//     }
//   }, [user]);

//   // poll every 30 sec
//   useEffect(() => {
//     if (!user) {
//       setUnreadCount(0);
//       setLatest([]);
//       return;
//     }
//     refresh();
//     const id = setInterval(refresh, 30000);
//     return () => clearInterval(id);
//   }, [user, refresh]);

//   return (
//     <NotificationContext.Provider value={{ unreadCount, latest, refresh }}>
//       {children}
//     </NotificationContext.Provider>
//   );
// };

// export const useNotifications = () => useContext(NotificationContext);

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id || user?.id; // sirf primitive value par depend karenge
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState([]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await api.get("/notifications?limit=6");
      setLatest(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("notifications refresh failed", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLatest([]);
      return;
    }
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [userId, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, latest, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);