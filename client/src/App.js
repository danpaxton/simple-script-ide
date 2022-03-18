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
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

import { useState, useEffect } from 'react';


const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#d50000'
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


const App = () => {
  const [code, setCode] = useLocalStorage('code', 'func = () => "Hello World"; print(func());');
  const [output, setOutput] = useLocalStorage('out', '');
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClear =() => {
      setOpen(false);
      setCode(""); 
      setOutput("");
  }

  const runCode = () => {
    axios
      .post("http://127.0.0.1:5000/sscript", parseProgram(code))
      .then(res =>  setOutput(res.data))
  }

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "slime_lang.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="App">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet"></link>
      <header className="App-header">
        <div className="Title flex items center absolute text-5xl top-2 left-40 right-40 text-left font-arvo text-green outline-5">
          Simple-Script Interpreter</div>
        <ThemeProvider theme={theme}>
        <div className='codeBox absolute top-20 bottom-80 left-40 right-40 text-left'>
        <Button variant="text" color="primary" onClick={runCode}> <Icon>play_arrow</Icon>Run</Button>
        <Button variant="text" color="primary" onClick={downloadCode}> <Icon>download</Icon>Download</Button>
          <Button variant="text" color="secondary" onClick={handleClickOpen}> <Icon>clear</Icon>Clear </Button>
          <Dialog open={open} onClose={handleClose} aria-labelledby="alert-dialog-title">
            <DialogTitle id="alert-dialog-title">{"Clear all code?"}</DialogTitle>
            <DialogActions>
              <Button variant="contained" color="primary" onClick={handleClose}>Cancel</Button>
              <Button variant="contained" color="secondary" onClick={handleClear}>Clear</Button>
            </DialogActions>
          </Dialog>
        <CodeMirror className='CodeMirror'
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
        <div className='outputBox absolute top-25 bottom-10 left-60 right-60 text-left text-red'>
          output: <p className='text-white'>{output}</p>
        </div> 
        </ThemeProvider>
      </header>
    </div>
  );
}

export default App;
