import { io } from "socket.io-client";

const protocol = window.location.protocol === "https:" ? "https" : "http";
const host = window.location.hostname;

export const socket = io(`${protocol}://${host}:3000`);