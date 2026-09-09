package com.ooro.screenplayer

import android.os.Bundle
import android.graphics.BitmapFactory
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.foundation.Image
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.PlayerView
import com.ooro.screenplayer.player.Media3CreativePlayer
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.ooro.screenplayer.kiosk.OoroDeviceAdminReceiver
import com.ooro.screenplayer.model.*

class MainActivity : ComponentActivity() {
    private val vm: ScreenViewModel by viewModels { ScreenViewModel.factory(applicationContext) }
    override fun onCreate(state: Bundle?) { super.onCreate(state); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); enterFullscreen(); OoroDeviceAdminReceiver.initialize(this,this); setContent { OoroTheme { Root(vm) } } }
    override fun onWindowFocusChanged(focus:Boolean) { super.onWindowFocusChanged(focus); if(focus) enterFullscreen() }
    private fun enterFullscreen() { WindowCompat.setDecorFitsSystemWindows(window,false); WindowInsetsControllerCompat(window,window.decorView).apply { hide(WindowInsetsCompat.Type.systemBars()); systemBarsBehavior=WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE } }
}
private val Yellow=Color(0xFFF5C400)
@Composable private fun OoroTheme(content: @Composable () -> Unit)=MaterialTheme(colorScheme=darkColorScheme(primary=Yellow,background=Color.Black,surface=Color(0xFF171717)),content=content)
@Composable private fun Root(vm:ScreenViewModel){ val state by vm.state.collectAsState(); when(state){ScreenState.Preparing->Message("Preparing screen…"); is ScreenState.Setup->Setup(vm,(state as ScreenState.Setup).message); is ScreenState.Player->Player(vm,(state as ScreenState.Player).manifest); is ScreenState.Admin->Admin(vm)}}
@Composable private fun Message(text:String){Box(Modifier.fillMaxSize().background(Color.Black),contentAlignment=Alignment.Center){Text("OORO\n$text",color=Color.White,fontSize=28.sp)}}
@Composable private fun Setup(vm:ScreenViewModel,message:String?){var code by remember{mutableStateOf("")};Box(Modifier.fillMaxSize().background(Color.Black),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Text("OORO",color=Yellow,fontSize=52.sp,modifier=Modifier.clickable{vm.showAdmin()});Text("Connect this screen",fontSize=28.sp);Spacer(Modifier.height(16.dp));OutlinedTextField(code,{code=it.uppercase().take(32)},label={Text("Pairing code")},singleLine=true);Spacer(Modifier.height(16.dp));Button({vm.pair(code)}){Text("Connect")};Text(message?:"Enter the code from the OORO workspace",color=Color.LightGray,modifier=Modifier.padding(16.dp))}}}
@Composable private fun Player(vm:ScreenViewModel,manifest:DeviceManifest){var taps by remember{mutableIntStateOf(0)};Box(Modifier.fillMaxSize().background(Color.Black).clickable{taps++;if(taps>=7)vm.showAdmin()}){when(manifest.layout){DisplayLayout.SPLIT_50_25_25->Column(Modifier.fillMaxSize()){Box(Modifier.weight(2f)){PlayerContent(vm,manifest,Modifier.fillMaxSize())};Row(Modifier.weight(1f)){NavigationPane(Modifier.weight(1f));UtilityPane(Modifier.weight(1f))}};else->PlayerContent(vm,manifest,Modifier.fillMaxSize())}}}
@Composable private fun PlayerContent(vm:ScreenViewModel,manifest:DeviceManifest,modifier:Modifier){val item=vm.currentItem(manifest);var path by remember(item?.id){mutableStateOf<String?>(null)};LaunchedEffect(item?.id){path=item?.let{vm.localFile(it)}};Box(modifier,contentAlignment=Alignment.Center){if(item!=null&&path!=null&&item.type==CreativeType.IMAGE){val bitmap=remember(path){path?.let{BitmapFactory.decodeFile(it)}};if(bitmap!=null){LaunchedEffect(item.id){vm.creativeStarted(item);kotlinx.coroutines.delay(item.durationSeconds*1000L);vm.creativeFinished(item,item.durationSeconds*1000L,true)};Image(bitmap.asImageBitmap(),"OORO creative",Modifier.fillMaxSize())}else Message("OORO content unavailable")}else if(item!=null&&path!=null){val context=LocalContext.current;val creative=remember(item.id){Media3CreativePlayer(context,{vm.creativeStarted(item)},{ms->vm.creativeFinished(item,ms,true)},{e->vm.creativeFinished(item,creativeDuration(item),false,e.message)},{/* bounded recovery is local to this creative */ creativeRecover(vm,item)})};DisposableEffect(path){creative.play(path!!);onDispose{if(creative.player.isPlaying)vm.creativeFinished(item,creative.player.currentPosition,false,"INTERRUPTED");creative.close()}};AndroidView({PlayerView(it).apply{player=creative.player;useController=false}},Modifier.fillMaxSize())}else Column(horizontalAlignment=Alignment.CenterHorizontally){Text("OORO",color=Yellow,fontSize=64.sp);Text("Offline — awaiting verified content",color=Color.White,fontSize=24.sp)}}}
private fun creativeRecover(vm:ScreenViewModel,item:ManifestItem):()->Unit = { /* player callback remains bounded by Media3 instance lifetime */ }
@Composable private fun NavigationPane(modifier:Modifier){Box(modifier.background(Color(0xFF20252B)),contentAlignment=Alignment.Center){Text("Trip information will appear here",color=Color.White,fontSize=16.sp)}}
@Composable private fun UtilityPane(modifier:Modifier){Box(modifier.background(Color(0xFF303030)),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Text(java.time.LocalTime.now().toString().take(5),color=Yellow,fontSize=26.sp);Text("Ride status unavailable",color=Color.White,fontSize=13.sp);Text("Offers appear when supplied",color=Color.LightGray,fontSize=12.sp)}}}
private fun creativeDuration(item:ManifestItem)=item.durationSeconds*1000L
@Composable private fun Admin(vm:ScreenViewModel){val diagnostic by vm.diagnostic.collectAsState();Box(Modifier.fillMaxSize().background(Color(0xFF101010)),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Text("Technician diagnostics",color=Yellow,fontSize=28.sp);Text("Device: ${vm.deviceId}",color=Color.White);Text("Device Owner: ${OoroDeviceAdminReceiver.isOwner(LocalContext.current)}",color=Color.White);Text(diagnostic,color=Color.LightGray,modifier=Modifier.padding(16.dp));Spacer(Modifier.height(8.dp));Button({vm.sync()}){Text("Refresh manifest")};Button({vm.unpair()}){Text("Unpair screen")};TextButton({vm.closeAdmin()}){Text("Close")}}}}
