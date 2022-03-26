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


const theme = createTheme({
  palette: {
    primary: {
      main: '#16a34a',
    },
    secondary: {
      main: '#b91c1c'
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
  const [output, setOutput] = useLocalStorage('out', '');
  const [fileId, setFileId] = useLocalStorage('fileId', null);
  const [fileTitle, setFileTitle] = useLocalStorage('fileTitle','Create new file.');
  
  const [fileList, setFileList] = useState([]);
  const [openClear, setOpenClear] = useState(false);
  const [openNewFile, setOpenNewFile] = useState(false);
  const [fileName, setFileName] = useState("");


  const handleOpenClear = () => setOpenClear(true);
  const handleCloseClear = () => setOpenClear(false);
  const handleClear = () => { setCode(""); setOutput(""); setOpenClear(false) };


  const onNameChange = (f) => setFileName(f.target.value);
  const handleOpenNewFile = () => setOpenNewFile(true);
  const handleCloseNewFile = () => { setFileName(""); setOpenNewFile(false) };
  const handleNewFile = () => { newFile(fileName); setFileName(""); setOpenNewFile(false) };



  const validInput = () => {
    const name_arr = fileName.split('.');
    if (name_arr.length > 2 || name_arr[1] !== 'sscript') {
      return { msg: "File name must end in '.sscript'.", isValid: false };
    }
    if (name_arr[1].length > 100) {
      return { msg: "Max character limit exceeded.", isValid: false };
    }
    return { isValid: true };
  }


  const fetchFiles = async () => {
    const data =  await axios.get(`${baseUrl}/fetch-files`)
    const { files } =  data.data;

    setFileList(files);
  }

  const runCode = () => {
    axios
      .post(`${baseUrl}/interp`, parseProgram(code))
      .then(res =>  setOutput(res.data))
  }

  const newFile = async (title) => {
    try {
      const { data } = await axios.post(`${baseUrl}/new-file`, {title: title, source_code: ""})
      setFileList([...fileList, data]);
      if (fileList.length > 0) {
        saveFile(fileId, code);
      }
      loadFile(data.id);
    } catch(err) {
      console.error(err.message);
    }
  }

  const deleteFile = async (title, id) => {
    try {
      await axios.delete(`${baseUrl}/fetch-file/${id}`)
      setFileList(fileList.filter(f => f.id !== id));
    } catch (err) {
      console.log(err.message);
    }
  }

  const loadFile = async (id) => {
    try {
      const { data } = await axios.get(`${baseUrl}/fetch-file/${id}`)
      if (fileList.length > 0) {
        saveFile(fileId, code);
      }
      setFileId(data.id);
      setFileTitle(data.title);
      setCode(data.source_code);
    } catch (err) {
      console.log(err.message);
    }
  }

  const saveFile = async (id, source_code) => {
   try {
      await axios.put(`${baseUrl}/update-file/${id}`, { source_code })
    } catch(err) {
      handleOpenNewFile();
    }
  }

  useEffect(() => {
    fetchFiles();
  }, [])

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "sscript.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="App">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet"></link>
        <div className="Title">
          Simple-Script IDE </div>
        <ThemeProvider theme={theme}>
        <div className='codeBox'>
        <Button variant="text" color="primary" onClick={runCode}> <Icon>play_arrow</Icon>Run</Button>
        <Button variant="text" color="primary" onClick={() => saveFile(fileId, code)}> <Icon>playlist_add_check</Icon>Save</Button>
        <Button variant="text" color="primary" onClick={downloadCode}> <Icon>download</Icon>Download</Button>
        <Button variant="text" color="secondary" onClick={handleOpenClear}> <Icon>clear</Icon>Clear </Button>
        <div className='fileName'>{fileTitle}</div>
        <Dialog open={openClear} aria-labelledby="alert-dialog-title">
          <DialogTitle id="alert-dialog-title">{"Clear all code?"}</DialogTitle>
          <DialogActions>
            <Button variant="contained" color="primary" onClick={handleCloseClear}>Cancel</Button>
            <Button variant="contained" color="secondary" onClick={handleClear}>Clear</Button>
          </DialogActions> 
        </Dialog>
        <CodeMirror 
          value={code}
          options={{
            theme: "colorforth",
            keymap: "sublime",
            mode: "jsx"
          }}
          onChange={(editor, change) => {
            setCode(editor.getValue());
          }}
        />
        </div>
        <div className="fileBox">
          <Button variant="text" color="primary" onClick={handleOpenNewFile}> <Icon>post_add</Icon>New file</Button>
          <Dialog open={openNewFile} aria-labelledby="alert-dialog-title"> 
            <DialogActions>
              <TextField id="standard-basic" defaultValue={fileName}  label="Enter file name." variant="standard" onChange={onNameChange}/>
              <Button variant="contained" color="primary" onClick={handleNewFile}>Enter</Button>
              <Button variant="contained" color="secondary" onClick={handleCloseNewFile}>Cancel</Button>
            </DialogActions> 
          </Dialog>
          <List dense={true} color="primary">
              {fileList.map(file => (
                <ListItem key={file.id}
                disablePadding
                  secondaryAction={
                    <IconButton edge="end" color="secondary" aria-label="delete" onClick={() => deleteFile(file.title, file.id)}>
                      <Icon>delete</Icon>
                    </IconButton>
                  }
                >
                <Button size='small' style={{textTransform:'none'}} variant="outlined" fullWidth={true} color="primary" onClick={() => loadFile(file.id)}>{file.title}</Button>
                </ListItem>)
              )}
            </List>
        </div>
        <div className='outputBox'>
          output: <p style={{color: 'white'}}>{output}</p>
        </div> 
        </ThemeProvider>
    </div>
  );
}

export default App;
