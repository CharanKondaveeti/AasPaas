import React from "react";
import {createRoot} from "react-dom/client";
import ExplorePage from "@/features/explore/components/ExplorePage";
import AdminPage from "@/features/admin/components/AdminPage";
import "@/styles/app.css";
import "maplibre-gl/dist/maplibre-gl.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode>{window.location.pathname.replace(/\/$/,"")==="/admin"?<AdminPage/>:<ExplorePage/>}</React.StrictMode>);
