import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export const setToken = (token, name) => {
  Cookies.set(name, token, { expires: 7, secure: true });
};

export const getToken = (name) => {
  return Cookies.get(name);
};

export const removeToken = (name) => {
  Cookies.remove(name);
  localStorage.clear();
};

export const isTokenValid = (
  token,
  tokenName
) => {
  if (!token) return false;

  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp <= currentTime) {
      removeToken(tokenName);
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};
