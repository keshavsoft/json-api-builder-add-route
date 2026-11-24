import {Hono} from "hono";
import v1Routes from "./v1/routes.js";
import v2Routes from "./v2/routes.js";
const routes = new Hono();
routes.route("/v1", v1Routes);
routes.route("/v2", v2Routes);
export default routes;
