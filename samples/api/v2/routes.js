import {Hono} from "hono";
import appointmentsRoutes from "./appointments/routes.js";
const routes = new Hono();
routes.route("/appointments", appointmentsRoutes);
export default routes;
