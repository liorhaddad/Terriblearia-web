import web_stdio
import unthrow
import time
import sys

unthrow.ResumableException.__bases__ = (BaseException,)
resumer = unthrow.Resumer()
g_user_input = ""
g_called_stop = False

class WebIO(object):
    def read(self):
        return ""
    def readline(self):
        unthrow.stop({"cmd": "readline"})
        return g_user_input + "\n"
    def write(self, s):
        web_stdio.write(s)
        pass
def __o_time_sleep(seconds):
    unthrow.stop({"cmd": "sleep", "time": seconds * 1000})
time.sleep = __o_time_sleep
del __o_time_sleep

sys.stdout = WebIO()
sys.stdin = sys.stdout
