import './App.css';

import axios from "axios";

import { parseProgram } from 'sscript-parser/src/parser/index.js';

import CodeMirror from '@uiw/react-codemirror';
import 'codemirror/keymap/sublime';
import 'codemirror/theme/colorforth.css';

import Button from '@mui/material/Button';
import Icon from '@mui/material/Icon';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';

import { useState, useEffect } from 'react';
import { ButtonGroup } from '@mui/material';


const theme = createTheme({
  palette: {
    primary: {
      main: '#1769aa',
    },
    secondary: {
      main: '#d32f2f'
    }
  },
});


const getStorageValue = (key, defaultValue) => localStorage.getItem(key) || defaultValue;

// Custom react hook to keep local storage.
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
};

const baseUrl = "http://localhost:5000/sscript"

const App = () => {
  const [code, setCode] = useLocalStorage('code', '');
  const [parsedCode, setParsedCode] = useLocalStorage('parsed', '');
  const [output, setOutput] = useLocalStorage('out', '');
  
  const [fileTitle, setFileTitle] = useState('Create, load, or save file.');
  const [fileId, setFileId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [hasChange, setHasChange] = useState(false);
  const [openClear, setOpenClear] = useState(false);
  const [openNewFile, setOpenNewFile] = useState(false);
  const [delButtons, setDelButtons] = useState(false);
  const [viewParse, setViewParse] = useState(false);
  const [fromSave, setFromSave] = useState(false);
  const [fileName, setFileName] = useState("");
  const [nameError, setNameError] = useState([]);


  const handleClear = () => { setCode(""); setOutput(""); setParsedCode(""); setOpenClear(false) };
  const handleOpenNewFile = () =>{ setFileName(""); setOpenNewFile(true); }
  const handleCloseNewFile = () => { setFileName(""); setNameError([false]); setOpenNewFile(false) };
  
  const handleNewFile = e => {
    e.preventDefault()
    const err = validInput()
    setNameError(err);
    if (!err[0]) {
      newFile(fileName, !fromSave ? "" : code);
      setFromSave(false);
      handleCloseNewFile();
    }
  };

  const validInput = () => {
    const name_arr = fileName.split('.');
    if (!fileName.includes(".") || name_arr.length > 2 || name_arr[1] !== 'ss') {
      return [true,"File name must end in '.ss'."]
    }
    if (name_arr[0].length > 24) {
      return [true, "Max character limit exceeded."];
    }
    const f_name = fileName.trim().toLowerCase();
    if (fileList.reduce((acc, e) => acc || (e.title.trim().toLowerCase() === f_name), false)) {
      return [true, "Dulpicate file name."]
    }
    return [false];
  }

  const runCode = async (e) => {
    const parsed = parseProgram(code);
    setParsedCode(JSON.stringify(parsed));
    await axios
      .post(`${baseUrl}/interp`, parsed)
      .then(res => setOutput(res.data))
  }

  const newFile = async (title, src) => {
    const { data } = await axios.post(`${baseUrl}/new-file`, {title: title, source_code: src})
    setFileList([...fileList, data]);
    loadFile(data.id);
    setHasChange(false);
  }

  const deleteFile = async (id) => {
    try {
      await axios.delete(`${baseUrl}/fetch-file/${id}`)
      if (id === fileId) {
        if (fileList.length > 1) {
          const pos = fileList.findIndex(f => f.id === id);
          loadFile(fileList[pos - 1].id);
        } else {
          setFileId(null);
          setFileTitle("Create or save file.");
          setCode("");
        }
      }
      setDelButtons(false);
      setFileList(fileList.filter(f => f.id !== id));
    } catch (err) {
      console.log(err.message);
    }
  }

  const loadFile = async (id) => {
    try {
      const { data } = await axios.get(`${baseUrl}/fetch-file/${id}`)
      setFileId(data.id);
      setFileTitle(data.title);
      setCode(data.source_code);
      setHasChange(false);
      setDelButtons(false);
    } catch (err) {
      console.log(err.message);
    }
  }

  const saveFile = async () => {
   try {
      if (fileId) {
        await axios.put(`${baseUrl}/update-file/${fileId}`, { source_code: code });
        setHasChange(false);
      } else {
        setFromSave(true)
        setOpenNewFile(true);
      }
    } catch(err) {
      console.log(err);
    }
  }

  useEffect(() => {
    const fetchFiles = async () => {
      const { data } = await axios.get(`${baseUrl}/fetch-files`);
      setFileList(data.files);
    }
    fetchFiles();
  }, [])

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = {fileName};
    document.body.appendChild(element);
    element.click();
  };

  return (
  <div className="wrapper">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet"></link>
    <ThemeProvider theme={theme}>
    <div className="header"><div className="headerText">Simple-Script IDE</div></div>
    <div className="sidebar">
      <ButtonGroup variant="text">
        <Button color="primary" onClick={handleOpenNewFile} style={{textTransform:'none'}}> <Icon>post_add</Icon>New File</Button>
        <Button color="secondary" onClick={() => setDelButtons(!delButtons)} style={{textTransform:'none'}}> <Icon>delete</Icon>Delete</Button>
      </ButtonGroup>
          <Dialog open={openNewFile} aria-labelledby="alert-dialog-title"> 
            <DialogActions>
              <TextField id="standard-basic" error={nameError[0]} label={nameError[0] ? nameError[1]: "Enter file name."} 
                variant="standard" onChange={f => setFileName(f.target.value)}/>
              <Button variant="contained" color="primary" onClick={handleNewFile}>Enter</Button>
              <Button variant="contained" color="secondary" onClick={handleCloseNewFile}>Cancel</Button>
            </DialogActions> 
          </Dialog>
          <List dense={true} color="primary" sx={{overflow: 'auto', position:'relative', maxHeight: 690}}>
              {fileList.map(file => (
                <ListItem key={file.id}
                  disablePadding
                  secondaryAction= { delButtons ?
                    <IconButton edge="end" color="secondary" aria-label="delete" onClick={() => deleteFile(file.id)}>
                      <Icon>delete</Icon>
                    </IconButton> : null
                  }
                >
                <Button size='small' style={{textTransform:'none'}} variant="outlined" fullWidth={true} color="primary" 
                  onClick={() => loadFile(file.id)}>{file.title}</Button>
                </ListItem>)
              )}
            </List></div>
    <div className="content">
          <Button variant="text" color="primary" onClick={runCode} style={{textTransform:'none'}}> 
            <Icon>play_arrow</Icon>Run</Button>
          <Button variant="text" color="primary" onClick={saveFile} style={{textTransform:'none'}}>
            <Icon>playlist_add_check</Icon>Save</Button>
          <Button variant="text" color="primary" onClick={downloadCode} style={{textTransform:'none'}}> 
            <Icon>download</Icon>Download</Button>
          <Button variant="text" color="secondary" onClick={() => setOpenClear(true)} style={{textTransform:'none'}}>
            <Icon>refresh</Icon>Clear </Button>
          <div className='fileName'>{fileTitle}</div>
          <div className='changes'>{ hasChange ? `Unsaved changes.` :  "All changes saved."}</div>
          <Dialog open={openClear} aria-labelledby="alert-dialog-title">
            <DialogTitle id="alert-dialog-title">{"Clear all code?"}</DialogTitle>
            <DialogActions>
              <Button variant="contained" color="primary" onClick={() => setOpenClear(false)}>Cancel</Button>
              <Button variant="contained" color="secondary" onClick={handleClear}>Clear</Button>
            </DialogActions> 
          </Dialog>
          <CodeMirror 
            value={code}
            options={{
              theme: "colorforth",
              keymap: "sublime",
              mode: "python"
            }}
            onChange={(editor, change) => {
              setHasChange(true);
              setCode(editor.getValue());
            }}
          /></div>
          <div className="footer">
            <Button variant='outlined' size='small' color='secondary' 
            onClick={() => setViewParse(!viewParse)}>{viewParse ? 'Parse ' : 'Output'}</Button>:
          { viewParse ? <p style={{color: 'white'}}>{parsedCode}</p>
           : <p style={{color: 'white'}}>{output}</p> } 
          
          </div>
  </ThemeProvider>
</div>)
}

export default App;
