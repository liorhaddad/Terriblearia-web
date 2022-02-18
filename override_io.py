import web_stdio
import unthrow
import time
import sys
import os

unthrow.ResumableException.__bases__ = (BaseException,)
resumer = unthrow.Resumer()
g_user_input = ""
g_called_stop = False

class WebIO(object):
    def __init__(self, handle = 0):
        self.__print_count = 0
        self._handle = handle
        self.buffer = None
        self.closed = False
        self.encoding = 'utf-8'
        self.errors = 'surrogateescape'
        self.line_buffering = True
        self.mode = 'r' if (handle % 3 == 0) else 'w'
        self.name = f"<std{'in' if (handle % 3 == 0) else ('out' if (handle % 3 == 1) else 'err')}>"
        self.newlines = os.linesep
        self.write_through = False
    def close(self):
        self.closed = True
    def detach(self):
        raise NotImplementedError
    def fileno(self):
        return self._handle
    def flush(self):
        unthrow.stop({"cmd": "flush"})
        pass
    def isatty(self):
        return True
    def read(self, size = -1):
        self.__print_count = 0
        inp = ""
        while (size < 0) or (len(inp) < size):
            unthrow.stop({"cmd": "readline"})
            inp += g_user_input + "\n"
        return inp if size < 0 else inp[:size]
    def readable(self):
        return True
    def readline(self, size = -1):
        self.__print_count = 0
        unthrow.stop({"cmd": "readline"})
        inp = g_user_input + "\n"
        return inp if size < 0 else inp[:size]
    def readlines(self, hint = -1):
        return list(map(lambda x: f"{x}\n", self.read(hint).split('\n')[:-1]))
    def reconfigure(self):
        raise NotImplementedError
    def seek(self, cookie, whence = 0):
        raise IOError("underlying stream is not seekable")
    def seekable(self):
        return False
    def tell(self):
        raise IOError("underlying stream is not seekable")
    def truncate(self, pos = None):
        raise IOError("unsupported operation")
    def writable(self):
        return True
    def write(self, text):
        if (self._handle % 3 == 2):
            web_stdio.write(text, "#FF0000")
            pass
        else:
            web_stdio.write(text)
            pass

        self.__print_count += len(text)
        if (text.find("\n") >= 0):
            self.__print_count = 0
        elif (self.__print_count > 2000):
            self.__print_count = 0
            self.flush()
    def writelines(self, lines):
        for line in lines:
            self.write(line)

class TimeSleep(object):
    def __init__(self):
        self.__str_text = time.sleep.__str__()
        self.__repr_text = time.sleep.__repr__()
    def __str__(self):
        return self.__str_text
    def __repr__(self):
        return self.__repr_text
    def __call__(self, seconds):
        unthrow.stop({"cmd": "sleep", "time": seconds * 1000})

time.sleep = TimeSleep()
del TimeSleep

sys.__stdin__  = sys.stdin  = WebIO(0)
sys.__stdout__ = sys.stdout = WebIO(1)
sys.__stderr__ = sys.stderr = WebIO(2)
