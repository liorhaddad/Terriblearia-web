import itertools
import traceback
import sys
__resumer = unthrow.Resumer()

def __get_user_input():
  while True:
    try:
      yield input( '>>> ' )
    except KeyboardInterrupt:
      pass
    except EOFError:
      break
  

def __exec_function( user_input ):
  try:
    compile( user_input, '<stdin>', 'eval' )
  except SyntaxError:
    return exec
  return eval
  

def __exec_user_input( user_input):
  global window
  import js as window
  try:
    retval = __exec_function( user_input )( user_input, globals() )
  except Exception as e:
    print( traceback.format_exc(), file = sys.stderr )
  else:
    if retval is not None:
      print( retval )
  del window
  

def __run():
  for user_input in __get_user_input():
    __exec_user_input(user_input)
  
