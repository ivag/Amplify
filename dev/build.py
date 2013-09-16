## Concatenates and builds javascripts and less files
import argparse, os, sys, subprocess, shutil

parser = argparse.ArgumentParser(description="Build a concatenated css and js files for Amp")
parser.add_argument('-p', '--path', default="../src", help="Location of Amp files")
args = parser.parse_args()


## Order in which the files are concatenated. Goes for less and JS too.
file_order = ( "core", "button", "input", "panel", "datepicker", "list", "grid" )

root = os.path.abspath( os.path.join(os.path.dirname(__file__), "..", "build") )

less_temp = os.path.join(root, 'css', "styles.less")
less_out = os.path.join(root, 'css', "styles.css")
js_out = os.path.join(root, 'js', "amp.js")
img_out = os.path.join(root, "img")

path = os.path.abspath( os.path.join( root, args.path ) )

csspath = os.path.join(path, 'css')
jspath = os.path.join(path, 'js')
imgpath = os.path.join(path, 'img')

lesstemp = open(less_temp, 'w')
jsout = open(js_out, 'w')

for filepath in file_order:
    less = open( os.path.join(csspath, filepath + ".less") )
    
    for line in less:
        if line.startswith('@import'):
            continue
        lesstemp.write(line)
    
    js = open( os.path.join(jspath, filepath + ".js") )
    jsout.write(js.read())


if os.path.exists(img_out):
    shutil.rmtree(img_out)

shutil.copytree(imgpath, img_out)