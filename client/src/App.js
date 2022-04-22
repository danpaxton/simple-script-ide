import './App.css';
import { useToken } from './useToken';

import axios from "axios";

import { parseProgram } from 'simple-script-parser';

import CodeMirror from '@uiw/react-codemirror';
import 'codemirror/keymap/sublime';
import 'codemirror/theme/night.css';

import { Button, Icon, IconButton, ButtonGroup } from '@mui/material';
import { Dialog, DialogActions, DialogTitle, DialogContentText, DialogContent, TextField } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { List, ListItemSecondaryAction, ListItemButton, ListItemText, ListItem } from '@mui/material';

import { useState, useEffect } from 'react';
import { Box } from '@mui/system';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1769aa',
    },
    secondary: {
      main: '#b2102f'
    }
  },
});

const baseUrl = "http://localhost:5000"

const App = () => {
  //Login Hooks
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { token, setToken, removeToken } = useToken();
  const [openLogin, setOpenLogin] = useState(false);
  const [openNewUser, setOpenNewUser] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [error, setError] = useState(false);
  const [showPass, setShowPass] = useState(false);

  //IDE Hooks
  const [code, setCode] = useState('');
  const [parsedCode, setParsedCode] = useState('');
  const [output, setOutput] = useState('');
  const [interpError, setInterpError] = useState(false);
  const [fileTitle, setFileTitle] = useState(token ? "Create or load a file." : "Login to create files.");
  const [fileId, setFileId] = useState(null);
  const [nextId, setNextId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [hasChange, setHasChange] = useState(false);
  const [openClear, setOpenClear] = useState(false);
  const [openNewFile, setOpenNewFile] = useState(false);
  const [openNoSave, setOpenNoSave] = useState(false);
  const [delButtons, setDelButtons] = useState(false);
  const [viewParse, setViewParse] = useState(false);
  const [fileName, setFileName] = useState("");
  const [nameError, setNameError] = useState([]);
  const [tokenExpired, setTokenExpired] = useState(false);

  
  // Login Handles
  const handleLogin = async () => {
    try {
        const { data } = await axios.post(`${baseUrl}/login`, { username, password })
        setToken(data); 
        setFileTitle("Create or load a file.")
        setOpenLogin(false);
        setLoginError(null);
        setError(false);
    } catch {
        setLoginError("Invalid username or password.");
        setError(true);
    }
  }

  const logOut = () => {
    setFileList([]);
    setFileId(null);
    setFileTitle("Login to create files.");
    setCode("");
    setOutput("");
    setParsedCode("");
    setHasChange(false);
    removeToken();
  }

  const handleNewUser = async (e) => {
      e.preventDefault();
      if (username.length > 50) {
        setRegisterError('Maximum username length exceeded.')
        setError(true); 
      }
      else if (username.includes(' ')) {
        setRegisterError('Username cannot contain spaces.')
        setError(true); 
      } else {
          try {
              await axios.post(`${baseUrl}/create-user`, { username, password })
              setOpenNewUser(false)
              setRegisterError(null)
              setError(false)
          } catch(err) {
              if (err.response.status === 401) {
                setRegisterError('User already exists.')
                setError(true);
              } else {
                console.log(err);
              }
          }
      }
  }

  const handleCloseLogin = () => {
      setOpenLogin(false);
      setLoginError(null); 
      setError(false);
      setShowPass(false);
  }

  const handleCloseNewUser = () => {
      setOpenNewUser(false);
      setError(false);
      setRegisterError(null); 
      setShowPass(false);
  }


  // File Handles
  const handleClear = () => { setCode(""); setOutput(""); setParsedCode(""); setOpenClear(false) };

  const handleOpenNewFile = () => { setFileName(""); setOpenNewFile(true) }

  const handleCloseNewFile = () => { setFileName(""); setNameError([false]); setOpenNewFile(false) };

  const handleUnsavedSave = () => { saveFile(); loadFile(nextId); setOpenNoSave(false) };

  const handleUnsavedIgnore = () => { loadFile(nextId); setOpenNoSave(false) };

  const handleLoadFile = (id) => {
    setDelButtons(false);
    if (fileId !== id) {
      if (!hasChange || !fileId) {
        loadFile(id)
      } else {
        setNextId(id); 
        setOpenNoSave(true); 
      } 
    }
  }

  const handleNewFile = e => {
    e.preventDefault()
    const err = validInput()
    setNameError(err);
    if (!err[0]) {
      newFile(fileName);
      handleCloseNewFile();
    }
  };

  const validInput = () => {
    const f_name = fileName.trim().toLowerCase()
    const name_arr = f_name.split('.');
    if (name_arr.length !== 2 || name_arr[1] !== 'ss') {
      return [true, "File name must end in '.ss'."]
    }
    if (name_arr[0].includes(" ")) {
      return [true, "File name must be one word."];
    }
    if (name_arr[0].length > 40) {
      return [true, "Max character limit exceeded."];
    }
    if (fileList.reduce((acc, e) => acc || (e.title.toLowerCase() === f_name), false)) {
      return [true, "Dulpicate file name."]
    }
    return [false];
  }

  const refresh = tok => {
    if (tok) {
      setToken({...token, access_token: tok})
    }
  }     

  const runCode = async () => {
    const parsed = parseProgram(code);
    setInterpError(parsed.kind === 'error');
    setParsedCode(JSON.stringify(parsed));
    const { data } = await axios.post(`${baseUrl}/interp`, parsed, token ? {
      headers: {
        'Authorization': `Bearer ${token.access_token}` 
      }
    }: {})
    refresh(data.access_token);
    setOutput(data.output);
  }

  const handleUnAuth = (err) => {
    if (err.response.status === 401) {
      logOut();
      setTokenExpired(true);
    } else {
      console.log(err);
    }
  }

  const newFile = async (title) => {
    try {
      const { data } = await axios.post(`${baseUrl}/new-file`, {title: title, source_code: ""}, {
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      })
      refresh(data.access_token); 
      setFileList([...fileList, data.file]);
      handleLoadFile(data.file.id);
    } catch(err) {
      handleUnAuth(err);
    }
  }

  const deleteFile = async (id) => {
    try {
      const {data} = await axios.delete(`${baseUrl}/fetch-file/${id}`,{
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      })
      if (id === fileId) {
        const nextFile = data.next_file
        if (nextFile) {
          loadFile(nextFile);
        } else {
          setFileId(null);
          setFileTitle("Create new file.");
          setCode("");
          setOutput("");
          setParsedCode("");
        }
      }
      refresh(data.access_token);
      setDelButtons(false);
      setFileList(fileList.filter(f => f.id !== id));
    } catch (err) {
      handleUnAuth(err);
    }
  }

  const loadFile = async (id) => {
    try {
      const { data } = await axios.get(`${baseUrl}/fetch-file/${id}`, {
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      })
      refresh(data.access_token);
      setFileId(data.file.id);
      setFileTitle(data.file.title);
      setCode(data.file.source_code);
      setOutput('');
      setParsedCode('');
      setHasChange(false);
      setDelButtons(false);
    } catch (err) {
      handleUnAuth(err)
    }
  }

  const saveFile = async () => {
   try {
      const { data } = await axios.put(`${baseUrl}/fetch-file/${fileId}`, { source_code: code }, {
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      });
      refresh(data.access_token);
      setHasChange(false);
    } catch(err) {
      handleUnAuth(err);
    }
  }
 
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const { data } = await axios.get(`${baseUrl}/fetch-files`,{
          headers: {
            'Authorization': `Bearer ${token.access_token}` 
          }
        });
        refresh(data.access_token);
        setFileList(data.files);
      } catch(err) {
        handleUnAuth(err);
      }
    }
    if (token) {
      fetchFiles();
    }
  }, [token])

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${fileId ? fileTitle : "untitled.ss"}`;
    document.body.appendChild(element);
    element.click();
  };

  const validCredentials = () => username.length && password.length

  return (
  <div className="wrapper">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet"></link>
    <ThemeProvider theme={theme}>
    <div className="header"><div className="headerText">Simple-Script IDE</div>
      <Dialog open={openLogin}> 
        <DialogTitle sx={{fontSize: 17}} id="alert-dialog-title">{"User login"}</DialogTitle>
        <DialogContent>
        <DialogContentText sx={{fontSize: 13}}>{error ? loginError : "Enter user credentials."}
          </DialogContentText>
            <DialogActions>
              <TextField  error={error} label={"Enter username."} 
                variant="standard" onChange={f => setUsername(f.target.value)}/>
              <TextField error={error} label={"Enter password."} 
                variant="standard" type={showPass ? "text" : "password"} onChange={f => setPassword(f.target.value)}/>
              <IconButton onClick={() => setShowPass(!showPass)}>
                {showPass ? (<Icon>visibility</Icon>) : (<Icon>visibility_off</Icon>)}</IconButton>
              <Button disabled={!validCredentials()} variant="contained" 
                size='small' color="primary" onClick={handleLogin}>Login</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleCloseLogin}>Cancel</Button>
            </DialogActions> 
            </DialogContent>
        </Dialog>
        <Dialog open={openNewUser}> 
          <DialogTitle sx={{fontSize: 17}} id="alert-dialog-title">{"Create new user"}</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{fontSize: 13}}>{error ? registerError : "Enter new user information."}</DialogContentText>
            <DialogActions>
              <TextField error={error} label={"Enter username."} 
                variant="standard" onChange={f => setUsername(f.target.value)}/>
              <TextField error={error} label={"Enter password."}
                variant="standard" type={showPass ? "text" : "password"} onChange={f => setPassword(f.target.value)}/>
              <IconButton onClick={() => setShowPass(!showPass)}>{showPass ? (<Icon>visibility</Icon>) : (<Icon>visibility_off</Icon>)}</IconButton>
              <Button disabled={!validCredentials()} 
                size='small' variant="contained" color="primary" onClick={handleNewUser}>Create</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleCloseNewUser}>Cancel</Button>
            </DialogActions> 
          </DialogContent>
        </Dialog>
        <Button sx={{color: 'white'}} align='right' onClick={() => window.open("https://github.com/danpaxton/simple-script-parser")}>language information</Button>
        </div>
        <div className="login">
        <Box sx={{ display: 'flex', 
                alignItems:'center', 
                     color: 'white', 
                  fontSize:"17px" ,
                fontFamily:"monospace", 
             flexDirection:'row-reverse'}} >
          <Button variant="contained" sx={{ color:"white" }} onClick={() => token ? logOut() : setOpenLogin(true)}>{token ? "Logout" : "Login"}</Button>
            { token ? token.username + "  :" : <Button sx={{color: 'white'}} onClick={() => setOpenNewUser(true)}>New User</Button>}
        </Box> 
        </div>
    <div className="sidebar">
      <div style={{background: "#212121"}}>
      <ButtonGroup size='small' fullWidth={true} variant="outlined">
        <Button color="primary" disabled={!token} onClick={handleOpenNewFile} > <Icon>post_add</Icon>New File</Button>
        <Button color="secondary" disabled={!token || !fileList.length} onClick={() => setDelButtons(!delButtons)} > <Icon>delete</Icon>Delete</Button>
      </ButtonGroup ></div>
          <Dialog open={openNewFile} aria-labelledby="alert-dialog-title"> 
            <DialogActions>
              <TextField id="standard-basic" error={nameError[0]} label={nameError[0] ? nameError[1]: "Enter file name."} 
                variant="standard" onChange={f => setFileName(f.target.value)}/>
              <Button variant="contained" size='small' color="primary" onClick={handleNewFile}>Enter</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleCloseNewFile}>Cancel</Button>
            </DialogActions> 
          </Dialog>
          <List dense={true} sx={{overflow: 'auto', color: 'white', maxHeight: 690}}>
              {fileList.map(file => (
                <ListItem disablePadding key={file.id} sx={{"&:hover": { backgroundColor: "#263238" }, width:360}}>
                <ListItemButton onClick={() => handleLoadFile(file.id)}> 
                  <ListItemText sx={{fontFamily: "monospace"}} primary={file.title}/>
              </ListItemButton>
                <ListItemSecondaryAction>
                    { delButtons ? <IconButton size='small' color='secondary' onClick={() => deleteFile(file.id)}>
                      <Icon>delete</Icon></IconButton> : null}
                  </ListItemSecondaryAction>
                </ListItem>)
              )}
            </List></div>
    <div className="content">
          <Button variant="text" color="primary" onClick={runCode} > 
            <Icon>play_arrow</Icon>Run</Button>
          <Button variant="text" color="primary" disabled={!fileId} onClick={saveFile}>
            <Icon>playlist_add_check</Icon>Save</Button>
          <Button variant="text" color="primary" onClick={downloadCode} > 
            <Icon>download</Icon>Download</Button>
          <Button variant="text" color="secondary" onClick={() => setOpenClear(true)} >
            <Icon>refresh</Icon>Clear </Button>
          <div className='fileName'>{fileTitle}</div>
          <div className='changes'>{ hasChange ? `Unsaved changes.` :  "All changes saved."}</div>
          <Dialog open={openClear} aria-labelledby="alert-dialog-title">
            <DialogTitle sx={{fontSize: 17, textAlign:'center'}} id="alert-dialog-title">{"Clear all code?"}</DialogTitle>
            <DialogActions>
              <Button variant="contained" size='small' color="primary" onClick={() => setOpenClear(false)}>Cancel</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleClear}>Clear</Button>
            </DialogActions> 
          </Dialog>
          <Dialog open={openNoSave} aria-labelledby="alert-dialog-title">
            <DialogTitle sx={{fontSize: 17, textAlign:'center'}} id="alert-dialog-title">{"Unsaved Changes."}</DialogTitle>
            <DialogActions>
              <Button variant="contained" size='small' color="primary" onClick={handleUnsavedSave}>Save Changes</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleUnsavedIgnore}>Ignore</Button>
            </DialogActions> 
          </Dialog>
          <CodeMirror 
            value={code}
            height='100%'
            options={{
              theme: "night",
              keymap: "sublime",
              mode: "text"
            }}
            onChange={(editor, change) => {
              setHasChange(true);
              setCode(editor.getValue());
            }}
          /></div>
          <div className="footer">
            <Button variant='outlined' size='small' color='secondary' 
              onClick={() => setViewParse(!viewParse)}>{viewParse ? 'Parse ' : 'Output'}
            </Button>:{ viewParse ? <p style={{color: 'white'}}>{parsedCode}</p>
              : <p style={{color: interpError ? '#b2102f' : '#6573c3'}}>{output}</p> } 
          </div>
          <Dialog open={tokenExpired}>
            <DialogTitle sx={{fontSize: 17, textAlign:'center'}}>{"Access token has expired. Logging out."}</DialogTitle>
            <DialogActions>
              <Button variant="contained" size='small' color="primary" onClick={() => setTokenExpired(false)}>OK</Button>
            </DialogActions> 
          </Dialog>
  </ThemeProvider>
</div>)
}

export default App;
