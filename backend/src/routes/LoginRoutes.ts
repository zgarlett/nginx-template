import express, { Router } from 'express';
import { LoginHandler } from '../handlers/LoginHandler.js';

const loginHandler = new LoginHandler();
const loginRoutes: Router = express.Router();

loginRoutes.post('/login', (req, res) => loginHandler.handleLogin(req, res));

export default loginRoutes;
