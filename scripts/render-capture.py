"""Replay capture-model.mjs commands with native surfaceless EGL/GLES.
Development-only requirements: Linux libEGL/libGLESv2, librsvg/Cairo and Pillow.
No server, browser or third-party network asset is involved.
"""
import ctypes as C, json, base64, sys, tempfile, os
from pathlib import Path
from PIL import Image, ImageStat
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
E=C.CDLL('libEGL.so.1');G=C.CDLL('libGLESv2.so.2')
E.eglGetProcAddress.argtypes=[C.c_char_p];E.eglGetProcAddress.restype=P
get_display=C.CFUNCTYPE(P,U,P,C.POINTER(I))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=get_display(0x31DD,None,None)
for name,args,result in [('eglInitialize',[P,C.POINTER(I),C.POINTER(I)],U),('eglChooseConfig',[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)],U),('eglBindAPI',[U],U),('eglCreatePbufferSurface',[P,P,C.POINTER(I)],P),('eglCreateContext',[P,P,P,C.POINTER(I)],P),('eglMakeCurrent',[P,P,P,P],U)]:
 f=getattr(E,name);f.argtypes=args;f.restype=result
major=I();minor=I();assert E.eglInitialize(display,C.byref(major),C.byref(minor))
attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
config=P();count=I();assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(count)) and count.value
payload=json.load(open(sys.argv[1] if len(sys.argv)>1 else '/tmp/apex-render-capture.json'));width=payload['width'];height=payload['height']
E.eglBindAPI(0x30A0);pbuffer=E.eglCreatePbufferSurface(display,config,(I*5)(0x3057,width,0x3056,height,0x3038));context=E.eglCreateContext(display,config,None,(I*3)(0x3098,2,0x3038));assert E.eglMakeCurrent(display,pbuffer,pbuffer,context)
spec={
'glShaderSource':([U,I,C.POINTER(C.c_char_p),C.POINTER(I)],None),'glGetShaderiv':([U,U,C.POINTER(I)],None),'glGetShaderInfoLog':([U,I,C.POINTER(I),C.c_char_p],None),
'glPolygonOffset':([F,F],None),'glCreateProgram':([],U),'glCreateShader':([U],U),'glCompileShader':([U],None),'glAttachShader':([U,U],None),'glLinkProgram':([U],None),'glGetProgramiv':([U,U,C.POINTER(I)],None),'glGetProgramInfoLog':([U,I,C.POINTER(I),C.c_char_p],None),'glGetAttribLocation':([U,C.c_char_p],I),'glGetUniformLocation':([U,C.c_char_p],I),
'glBindBuffer':([U,U],None),'glBufferData':([U,C.c_ssize_t,P,U],None),'glGenBuffers':([I,C.POINTER(U)],None),'glBindTexture':([U,U],None),'glGenTextures':([I,C.POINTER(U)],None),'glTexImage2D':([U,I,I,I,I,I,U,U,P],None),'glTexParameteri':([U,U,I],None),'glGenerateMipmap':([U],None),'glPixelStorei':([U,I],None),
'glBindFramebuffer':([U,U],None),'glGenFramebuffers':([I,C.POINTER(U)],None),'glFramebufferTexture2D':([U,U,U,U,I],None),'glBindRenderbuffer':([U,U],None),'glGenRenderbuffers':([I,C.POINTER(U)],None),'glRenderbufferStorage':([U,U,I,I],None),'glFramebufferRenderbuffer':([U,U,U,U],None),
'glEnable':([U],None),'glDisable':([U],None),'glBlendFunc':([U,U],None),'glViewport':([I,I,I,I],None),'glClearColor':([F,F,F,F],None),'glClear':([U],None),'glUseProgram':([U],None),'glDisableVertexAttribArray':([U],None),'glEnableVertexAttribArray':([U],None),'glVertexAttribPointer':([U,I,U,B,I,P],None),'glUniformMatrix4fv':([I,I,B,C.POINTER(F)],None),'glUniform3fv':([I,I,C.POINTER(F)],None),'glUniform1f':([I,F],None),'glUniform1i':([I,I],None),'glDrawArrays':([U,I,I],None),'glDepthMask':([B],None),'glActiveTexture':([U],None),'glReadPixels':([I,I,I,I,U,U,P],None),'glFinish':([],None),'glGetError':([],U)}
for name,(args,result)in spec.items():f=getattr(G,name);f.argtypes=args;f.restype=result
from vector_art import load_image
resources={};flip=False;shaders=0;frames=0
raw=lambda value:base64.b64decode(value['bytes'])
def resource(value):
 if value is None:return 0
 if isinstance(value,dict):
  if 'rid'in value:return resources[value['rid']]
  if 'uniform'in value:return G.glGetUniformLocation(resource(value['program']),value['name'].encode())
  if 'attrib'in value:return G.glGetAttribLocation(resource(value['program']),value['name'].encode())
 return value
for index,cmd in enumerate(payload['commands']):
 name=cmd['name'];args=cmd.get('args',[])
 try:
  if name.startswith('create'):
   if name=='createShader':value=G.glCreateShader(*args)
   elif name=='createProgram':value=G.glCreateProgram()
   else:
    out=U();getattr(G,{'createBuffer':'glGenBuffers','createTexture':'glGenTextures','createFramebuffer':'glGenFramebuffers','createRenderbuffer':'glGenRenderbuffers'}[name])(1,C.byref(out));value=out.value
   resources[cmd['result']['rid']]=value
  elif name=='shaderSource':
   source=args[1].encode();G.glShaderSource(resource(args[0]),1,(C.c_char_p*1)(source),None)
  elif name=='compileShader':
   shader=resource(args[0]);G.glCompileShader(shader);ok=I();G.glGetShaderiv(shader,0x8B81,C.byref(ok));log=C.create_string_buffer(4096);G.glGetShaderInfoLog(shader,4096,None,log);assert ok.value,log.value;shaders+=1
  elif name=='linkProgram':
   program=resource(args[0]);G.glLinkProgram(program);ok=I();G.glGetProgramiv(program,0x8B82,C.byref(ok));log=C.create_string_buffer(4096);G.glGetProgramInfoLog(program,4096,None,log);assert ok.value,log.value
  elif name=='bufferData':
   data=raw(args[1]);buf=C.create_string_buffer(data);G.glBufferData(resource(args[0]),len(data),buf,resource(args[2]))
  elif name=='pixelStorei'and args[0]==0x9240:flip=bool(args[1])
  elif name=='texImage2D':
   if len(args)==6:
    im=load_image(args[5]['path']);im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)if flip else im;buf=C.create_string_buffer(im.tobytes());G.glTexImage2D(*[resource(x)for x in args[:3]],im.width,im.height,0,resource(args[3]),resource(args[4]),buf)
   else:
    buf=C.create_string_buffer(raw(args[-1]))if isinstance(args[-1],dict)else None;G.glTexImage2D(*[resource(x)for x in args[:-1]],buf)
  elif name=='uniformMatrix4fv':
   data=C.create_string_buffer(raw(args[2]));G.glUniformMatrix4fv(resource(args[0]),1,0,C.cast(data,C.POINTER(F)))
  elif name=='uniform3fv':
   data=(F*len(args[1]))(*args[1])if isinstance(args[1],list)else C.cast(C.create_string_buffer(raw(args[1])),C.POINTER(F));G.glUniform3fv(resource(args[0]),1,data)
  elif name=='screenshot':
   G.glFinish();buf=C.create_string_buffer(width*height*4);G.glReadPixels(0,0,width,height,0x1908,0x1401,buf);im=Image.frombytes('RGBA',(width,height),buf.raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB');assert min(ImageStat.Stat(im).stddev)>10,'Blank frame';im.save(args[0],quality=93,method=6);frames+=1;print(args[0],flush=True)
  else:getattr(G,'gl'+name[0].upper()+name[1:])(*[resource(x)for x in args])
  error=G.glGetError();assert error==0,'GL error '+hex(error)
 except Exception:
  print('Failed command',index,name,file=sys.stderr);raise
print(f'Compiled {shaders} shaders and rendered {frames} nonblank frames.',flush=True)
