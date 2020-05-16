import { History } from "history";
import { Router } from "react-router";
import React from "react";
import ReactDOM from "react-dom";
import { ThemeProvider } from "styled-components";
import App from "./containers/app";
import "typeface-poppins";
import "typeface-roboto";
import GlobalStyle from "./styles/global";
import { Services } from "../services/types";
import { theme } from "./styles/theme";
import Routes from "./routes";

export function setupUI(options: { services: Services; history: History }) {
  ReactDOM.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Router history={options.history}>
          <App services={options.services}>
            <Routes services={options.services} />
          </App>
        </Router>
      </ThemeProvider>
    </React.StrictMode>,
    document.getElementById("root")
  );
}
