import './App.css';
import useToken from './useToken';
import Login from './Login';

import axios from "axios";

import { parseProgram } from 'simple-script-parser';

import CodeMirror from '@uiw/react-codemirror';
import 'codemirror/keymap/sublime';
import 'codemirror/theme/material-darker.css';



import { Button, Icon, IconButton, ButtonGroup,ToggleButtonGroup, ToggleButton} from '@mui/material';
import { Dialog, DialogActions, DialogTitle, TextField } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { List, ListItemSecondaryAction, ListItemButton, ListItemText, ListItem } from '@mui/material';

import { useState, useEffect } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1769aa',
      secondary: 'white'
    },
    secondary: {
      main: '#b2102f'
    }
  },
});

export const api = axios.create({
  baseURL: 'https://simple-script-ide.herokuapp.com'
})

export const App = () => {
  // IDE Hooks
  const { token, setToken, removeToken } = useToken();
  const [out, setOut] = useState({output: '', parsed: ''})
  const [file, setFile ] = useState({title: token ? "Create or load a file." : "Login to create files.", id: null, code: ''})
  const [nextId, setNextId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [hasChange, setHasChange] = useState(false);
  const [openClear, setOpenClear] = useState(false);
  const [openNewFile, setOpenNewFile] = useState(false);
  const [openNoSave, setOpenNoSave] = useState(false);
  const [delButtons, setDelButtons] = useState(false);
  const [view, setView] = useState('output');
  const [interpError, setInterpError] = useState(false);
  const [fileName, setFileName] = useState("");
  const [nameError, setNameError] = useState([]);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [running, setRunning] = useState(false)

  // Controls axios request for code interpretation.
  let controller = new AbortController()
  
  // IDE Handles

  const handleClear = () => { setOut({output:'', parsed:''}); setFile({...file, code: ''}); setOpenClear(false) };

  const handleOpenNewFile = () => { setFileName(""); setOpenNewFile(true) }

  const handleCloseNewFile = () => { setFileName(""); setNameError([false]); setOpenNewFile(false) };

  const handleUnsavedSave = () => { saveFile(); loadFile(nextId); setOpenNoSave(false) };

  const handleUnsavedIgnore = () => { loadFile(nextId); setOpenNoSave(false) };

  const logOut = () => {
    setFileList([]);
    setFile({title: "Login to create files.", id: null, code:''})
    setOut({output:'', parsed:''})
    setHasChange(false);
    setView('output')
    removeToken();
  }

  const handleLoadFile = (id) => {
    setDelButtons(false);
    if (file.id !== id) {
      if (!hasChange || !file.id) {
        loadFile(id)
      } else {
        setNextId(id); 
        setOpenNoSave(true); 
      } 
    }
  }

  const handleNewFile = () => {
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
    if (name_arr.length !== 2 || name_arr[1] !== 'sc') {
      return [true, "File name must end in '.sc'."]
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
  
  // User api calls
  const runCode = async () => {
    setRunning(true)
    controller = new AbortController()
    const sig = controller.signal
    const parsed = parseProgram(file.code);
    const { data } = await api.post(`/interp`, parsed, token ? {
      headers: {
        'Authorization': `Bearer ${token.access_token}` 
      }, signal : sig
    }: { signal : sig })
    if (!controller.signal.aborted) {
      setInterpError(parsed.kind === 'error');
      refresh(data.access_token);
      setOut({output: data.output,  parsed: JSON.stringify(parsed) });
    }
    setRunning(false)
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
      const { data } = await api.post(`/new-file`, {title: title, code: ""}, {
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
      const {data} = await api.delete(`/fetch-file/${id}`,{
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      })
      if (id === file.id) {
        const nextFile = data.next_file
        if (nextFile) {
          loadFile(nextFile);
        } else {
          setFile({title:"Create new file.", id: null, code:''})
          setOut({output: '', parsed: ''})
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
      const { data } = await api.get(`/fetch-file/${id}`, {
        headers: {
          'Authorization': `Bearer ${token.access_token}` 
        }
      })
      refresh(data.access_token);
      setFile(data.file);
      setOut({output: '', parsed: ''});
      setHasChange(false);
      setDelButtons(false);
    } catch (err) {
      handleUnAuth(err)
    }
  }

  const saveFile = async () => {
   try {
      const { data } = await api.put(`/fetch-file/${file.id}`, { code: file.code }, {
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
        const { data } = await api.get(`/fetch-files`,{
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
    const download = new Blob([file.code], { type: "text/plain" });
    element.href = URL.createObjectURL(download);
    element.download = `${(file.id ? file.title.split('.')[0] : "untitled") + ".txt"}`;
    document.body.appendChild(element);
    element.click();
  };

  return (
  <div className="wrapper">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet"></link>
    <ThemeProvider theme={theme}>
    <div className="header"><div className="headerText">Simple-Script IDE</div>
      <Button sx={{color: 'white'}} align='right' onClick={() => window.open("https://www.npmjs.com/package/simple-script-parser")}>language information</Button>
    </div>
    <Login token={token} setToken={setToken} setView={setView}
      setFile={setFile} setOut={setOut} logOut={logOut}/>
    <div className="sidebar">
        <Dialog open={openNewFile} aria-labelledby="alert-dialog-title"> 
            <DialogActions>
              <TextField id="standard-basic" error={nameError[0]} label={nameError[0] ? nameError[1]: "Enter file name."} 
                variant="standard" onChange={f => setFileName(f.target.value)}/>
              <Button variant="contained" size='small' color="primary" onClick={handleNewFile}>Enter</Button>
              <Button variant="contained" size='small' color="secondary" onClick={handleCloseNewFile}>Cancel</Button>
            </DialogActions> 
          </Dialog>
        <div className='listHeader'>
          <ButtonGroup variant="text" fullWidth={true}>
            <Button color="primary" disabled={!token} onClick={handleOpenNewFile} > <Icon>post_add</Icon>New File</Button>
            <Button color="secondary" disabled={!token || !fileList.length} onClick={() => setDelButtons(!delButtons)} > <Icon>delete</Icon>Delete</Button>
          </ButtonGroup>
        </div>
        <div className='list'>
          <List dense={true}>
          {fileList.map(curr_file => (
            <ListItem disablePadding key={curr_file.id} 
              sx={{"&& .Mui-selected": { backgroundColor: "rgba(38, 50, 56, .75)" },
                "&:hover": { backgroundColor: 'rgba(255, 255, 255, .3)'}, width: '400px'}}>
            <ListItemButton selected={curr_file.id === file.id} onClick={() => handleLoadFile(curr_file.id)}> 
              <ListItemText sx={{fontFamily: "monospace"}} primary={curr_file.title}/>
            </ListItemButton>
            <ListItemSecondaryAction>
                { delButtons ? <IconButton size='small' color='secondary' onClick={() => deleteFile(curr_file.id)}>
                  <Icon>delete</Icon></IconButton> : null}
              </ListItemSecondaryAction>
            </ListItem>)
          )}
          </List>
        </div>
    </div>
    <div className="content">
          <div className="contentButtons"> 
            <Button variant="text" color="primary" disabled={(token && !file.id) || running} onClick={runCode} > 
              <Icon>play_arrow</Icon>Run</Button>
            <Button variant="text" color="secondary" disabled={!running} onClick={() => controller.abort()}> 
              <Icon>stop</Icon>stop</Button>
            <Button variant="text" color="primary" disabled={!file.id || !hasChange} onClick={saveFile}>
              <Icon>playlist_add_check</Icon>Save</Button>
            <Button variant="text" color="primary" disabled={token && !file.id} onClick={downloadCode} > 
              <Icon>download</Icon>Download</Button>
            <Button variant="text" color="secondary" disabled={token && !file.id} onClick={() => setOpenClear(true)} >
              <Icon>refresh</Icon>Clear </Button>
            <div className='changes'>{ token && file.id ? (hasChange ? `Unsaved changes.` :  "All changes saved.") : null}</div>
            <div className='fileName'>{file.title}</div>
          </div>
          <Dialog open={openClear}>
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
              value={file.code}
              options={{
                readOnly: token && !file.id ? 'nocursor': false,
                theme: "material-darker",
                keymap: "sublime",
                mode: "jsx"
              }}
              onChange={(editor, change) => {
                setHasChange(true);
                setFile({...file, code: editor.getValue()});
              }}
            />
          </div>
          <div className="footer">
            <div className='footerButtons'>
              <ToggleButtonGroup size='small'
                sx={{ 
                  "&& .Mui-selected": { color:'white', background: "rgba(38, 50, 56, .75)"}
                  }} value={view} exclusive onChange={(event, val) => setView(val)}>
                <ToggleButton value='output'>Output</ToggleButton>
                <ToggleButton value='parse'>Parse</ToggleButton>
                <ToggleButton value='state'>State</ToggleButton>
              </ToggleButtonGroup>
            </div>
            <div className='footerContent' style={{ color: view === 'parse' ? 'white' 
              : (view === 'output' ? (interpError ? '#b2102f' : '#6573c3'): '#6573c3') }}>
                {view === 'parse' ? out.parsed : view === 'output' ? out.output : out.output}
              </div>
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
