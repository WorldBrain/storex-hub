import createBrowserHistory from "history/createBrowserHistory";
import * as serviceWorker from "./serviceWorker";
import { setupUI } from "./ui";
import { createServices } from "./services";

export async function main() {
  const inMemory = process.env.REACT_APP_IN_MEMORY === 'true'
  const history = createBrowserHistory({
    basename: process.env.PUBLIC_URL,
  });
  const services = await createServices({ history, inMemory });
  setupUI({ services, history });

  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: https://bit.ly/CRA-PWA
  serviceWorker.unregister();
}
