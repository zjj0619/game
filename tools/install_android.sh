set -e
T=/home/box/android; mkdir -p $T && cd $T
if [ ! -d jdk17 ]; then wget -q "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" -O jdk.tgz && mkdir jdk17 && tar xzf jdk.tgz -C jdk17 --strip-components=1 && rm jdk.tgz; fi
export JAVA_HOME=$T/jdk17 PATH=$T/jdk17/bin:$PATH
java -version
mkdir -p $T/sdk/cmdline-tools
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O clt.zip
unzip -q -o clt.zip -d $T/sdk/cmdline-tools && rm -rf $T/sdk/cmdline-tools/latest && mv $T/sdk/cmdline-tools/cmdline-tools $T/sdk/cmdline-tools/latest && rm clt.zip
export ANDROID_HOME=$T/sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" >/dev/null
echo SDK_DONE
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "emulator" "system-images;android-30;google_apis;x86_64" >/dev/null
echo EMU_DONE
