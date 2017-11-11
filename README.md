# nola300
code repo for the Nola300 project


#install instructions
- install git https://git-scm.com/download/mac
- setup git names

```
git config --global user.name "Jeff Crouse"
git config --global user.email jeff@seethroughlab.com
```

- ``mkdir Developer && cd Developer``
- ``git clone https://github.com/jeffcrouse/nola300-client.git``
- Move the 2 frameworks in Frameworks folder into /Library/Frameworks
- Add .env file
- install home-brew 
```/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"```
- ``brew update``
- ``brew install mongodb``
- Make sure to enable auto-startup options
- Install https://studio3t.com/
- Turn on auto-login
- Turn off energy settings
- install Node https://nodejs.org/en/
- ``nom install pm2 -g`
- install mongodb  
- install FFMPEG


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

- Make aliases of video apps on desktop

## Make folders

- Music Folder: ~/Music/NOLA_SOUNDTRACK (used by RearProjector)
- Textures Folder: ~/Movies/NOLA_TEXTURES (used by FrontProjector)
- Videos Folder: ~/Movies/NOLA_VIDEOS (used by nola300-client)
- Storage Folder: ~/Documents/NOLA_STORAGE (used by nola300-client)

## Make launch_server.command

```
cd ~/Developer/nola300-client
npm start
```
chmod a+x launch_server.command