# nola300
code repo for the Nola300 project


#install instructions
- Install SublimeText and ``ln -s "/Applications/Sublime Text 2.app/Contents/SharedSupport/bin/subl" /usr/local/bin/subl``
- install git https://git-scm.com/download/mac
- setup git names

```
git config --global user.name "Jeff Crouse"
git config --global user.email jeff@seethroughlab.com
```

- ``mkdir Developer && cd Developer``
- ``git clone https://github.com/jeffcrouse/nola300-client.git``
- ``cd ~/Developer/nola300-client && npm install``
- Move the 2 frameworks in Frameworks folder into /Library/Frameworks
- Add .env file

- Make sure to enable auto-startup options
- Install https://robomongo.org
- Turn on auto-login
- Turn off energy settings
- install Node https://nodejs.org/en/
- ``npm install pm2 -g`
- Make aliases of video apps on desktop

### Homebrew stuff
```/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"```
``sudo chown -R `whoami` /usr/local``
``brew update``
``brew install mongodb``

```
brew install ffmpeg \
    --with-tools \
    --with-fdk-aac \
    --with-freetype \
    --with-fontconfig \
    --with-libass \
    --with-libvorbis \
    --with-libvpx \
    --with-opus \
    --with-x265
```

```
brew install lame
brew install sox --with-lame
```

## Make folders

- Music Folder: ~/Music/NOLA_MUSIC (used by RearProjector)
- Textures Folder: ~/Movies/NOLA_TEXTURES (used by FrontProjector)
- Videos Folder: ~/Movies/NOLA_VIDEOS (used by nola300-client)
- Storage Folder: ~/Documents/NOLA_STORAGE (used by nola300-client)

## Copy Files 

- To Music Folder
- To Textures Folder
- To Videos Folder

## Make launch_server.command

```
cd ~/Developer/nola300-client
npm start
```
chmod a+x launch_server.command




## Run Video Sync Script
```
cd ~/Developer/nola300-client
node scripts/video_tag_sync.js
```
