import { useState } from 'react';

const useToken = () => {
  function getToken() {
    const userToken = localStorage.getItem('token');
    return userToken ? JSON.parse(userToken) : null
  }

  const [token, setToken] = useState(getToken());

  function saveToken(userToken) {
    localStorage.setItem('token', JSON.stringify(userToken));
    setToken(userToken);
  };

  function removeToken() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return {
    setToken: saveToken,
    token,
    removeToken
  }
}
export default useToken;
