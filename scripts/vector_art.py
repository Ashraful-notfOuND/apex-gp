"""Native SVG rasterization for previews/GLB exports; no game dependency."""
import ctypes as C
import os
import sys
import tempfile
import xml.etree.ElementTree as ET
from PIL import Image

def load_image(path):
    if not str(path).endswith('.svg'):
        return Image.open(path).convert('RGBA')
    p=C.c_void_p
    r=C.CDLL('librsvg-2.so.2');k=C.CDLL('libcairo.so.2');o=C.CDLL('libgobject-2.0.so.0')
    class Rect(C.Structure):
        _fields_=[('x',C.c_double),('y',C.c_double),('width',C.c_double),('height',C.c_double)]
    r.rsvg_handle_new_from_file.argtypes=[C.c_char_p,C.POINTER(p)];r.rsvg_handle_new_from_file.restype=p
    r.rsvg_handle_render_document.argtypes=[p,p,C.POINTER(Rect),C.POINTER(p)];r.rsvg_handle_render_document.restype=C.c_int
    k.cairo_image_surface_create.argtypes=[C.c_int,C.c_int,C.c_int];k.cairo_image_surface_create.restype=p
    k.cairo_create.argtypes=[p];k.cairo_create.restype=p
    k.cairo_surface_write_to_png.argtypes=[p,C.c_char_p];k.cairo_surface_write_to_png.restype=C.c_int
    k.cairo_destroy.argtypes=[p];k.cairo_surface_destroy.argtypes=[p];o.g_object_unref.argtypes=[p]
    root=ET.parse(path).getroot();width=int(root.attrib['width']);height=int(root.attrib['height'])
    error=p();handle=r.rsvg_handle_new_from_file(os.fsencode(path),C.byref(error));assert handle,path
    target=k.cairo_image_surface_create(0,width,height);ctx=k.cairo_create(target);rect=Rect(0,0,width,height)
    assert r.rsvg_handle_render_document(handle,ctx,C.byref(rect),C.byref(error))
    fd,temp=tempfile.mkstemp(suffix='.png');os.close(fd)
    try:
        assert k.cairo_surface_write_to_png(target,os.fsencode(temp))==0
        return Image.open(temp).convert('RGBA')
    finally:
        os.unlink(temp);k.cairo_destroy(ctx);k.cairo_surface_destroy(target);o.g_object_unref(handle)

if __name__=='__main__':
    load_image(sys.argv[1]).save(sys.argv[2])
