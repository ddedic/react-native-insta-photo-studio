import {
  View,
  Text,
  StyleSheet,
  PixelRatio,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  InteractionManager,
  Easing,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import React, {Component} from 'react';
import Header from './components/header';
import Footer from './components/footer';
import CameraRollPicker from './components/camera-roll-picker';
import PhotoCamera from './components/camera';
import CropperView from './components/cropper-view';
import Swiper from './components/swiper';
import clamp from 'clamp';
const SCROLLVIEW_REF = "SCROLLVIEW_REF";
const TOP_BAR_HEIGHT = 45;
const FOOTER_HEIGHT = 45;

export default class PhotoManager extends Component {

  constructor(props) {
    super(props);
    this.startValue = 0;
    this.isResponding = true;
    this.state = {
      headerHasNextButton: true,
      anim: new Animated.Value(0),
      isRetracted: false,
      currentImage: undefined,
      forceTopBarShow: false,
      currentSwiperIndex: 0,
      smallCameraRollContainer: true
    };
    this.currentSwiperIndex = 0;
  }

  componentWillMount() {
    this.updateHeader('library');
  }

  onFooterPress(action) {
    this.updateHeader(action);
    this.swiper && this.swiper.scrollToPage(action === 'library'
      ? 0
      : 1);
  }

  updateHeader(action) {
    let headerTitle = this.state.headerTitle;
    let headerHasNextButton = true;
    switch (action) {
      case 'library':
        headerTitle = this.props.libraryDisplayName;
        break;
      case 'photo':
        headerHasNextButton = false;
        headerTitle = this.props.photoDisplayName;
        break;
      default:
    }
    this.setState({headerTitle, headerHasNextButton});
  }

  onPhotoTaken(photo) {}

  onCancelAction() {
    this.props.onClose && this.props.onClose();
  }

  willStartAnimating() {
    this.isResponding = false;
    this.state.anim.stopAnimation((value) => {
      this.startValue = value;
      this.isResponding = true;
    });
  }

  getAnimationValue(val) {
    if (!this.isResponding) {
      return;
    }
    const fixedValue = ((-val) + this.startValue);
    const minimum = -this.props.window.width;
    const maximum = 0;
    if (fixedValue > minimum && fixedValue < maximum) {
      return {
        fixedValue: clamp(minimum, fixedValue, maximum),
        inputValue: val
      };
    }
  }

  animate(val, correctedValue) {
    const valueObj = correctedValue || this.getAnimationValue(val);
    if (valueObj !== undefined) {
      this.state.anim.setValue(valueObj.fixedValue);
      if (valueObj.inputValue > 0 && this.state.smallCameraRollContainer) {
        this.setState({smallCameraRollContainer: false});
      }
    }
  }

  finnishAnimation(finnishRetracted) {
    const retractedValue = (-this.props.window.width);
    this.isResponding = false;
    this.state.anim.stopAnimation((value) => {
      Animated.timing(this.state.anim, {
        toValue: finnishRetracted
          ? retractedValue
          : 0,
        duration: 220,
        easing: Easing.inOut(Easing.ease),
      //  useNativeDriver : true
      }).start((e) => {
        if (e.finished) {
          this.startValue = finnishRetracted
            ? retractedValue
            : 0;
          const isRetracted = this.isRetracted();
          if (!isRetracted && !this.state.smallCameraRollContainer) {
            this.setState({smallCameraRollContainer: true});
          }
        }
      });
    });
    this.setState({isRetracted: finnishRetracted});
  }

  isRetracted() {
    return (this.startValue < (-this.props.window.width / 2));
  }

  resetAnimation() {
    this.finnishAnimation(this.isRetracted());
  }

  onSelectedImagesChanged(selectedImages, image) {
    this.setState({currentImage: image});
    if (this.isRetracted()) {
      this.finnishAnimation(false);
    }
  }

  onSelectedPageChanged(newPageIndex, lastPageIndex) {
    if (newPageIndex !== this.state.currentSwiperIndex) {
      this.setState({currentSwiperIndex: newPageIndex});
      this.updateHeader(newPageIndex === 0
        ? 'library'
        : 'photo');
      //Force to show header if we a are not on the firstpage, but it's retracted.
      this.setState({
        forceTopBarShow: newPageIndex !== 0 && this.isRetracted()
      });
    }
  }

  render() {
    const animationStyle = {
      transform: [
        {
          translateY: this.state.anim
        }
      ]
    };

    const cropperView = {
      height: this.props.window.width
    };
    const cameraRollPickerView = {
      marginTop: this.props.window.width,
      paddingBottom: FOOTER_HEIGHT + TOP_BAR_HEIGHT,
      height: 100
    };

    const mainAnimationContainer = {
      height: this.props.window.height + this.props.window.width
    };

    const forceTopBarAnim = {};
    if (this.state.forceTopBarShow) {
      forceTopBarAnim.transform = [
        {
          translateY: 0
        }
      ];
    }

    const mainAreaHeight = (this.props.window.height - TOP_BAR_HEIGHT - FOOTER_HEIGHT);

    const scrollViewStyle = {
      position: 'absolute',
      height: this.state.smallCameraRollContainer
        ? (mainAreaHeight - this.props.window.width)
        : mainAreaHeight
    };
    const isRetracted = this.isRetracted();

    return (
      <View style={styles.container}>
        <StatusBar hidden={true}></StatusBar>
        <Swiper
          pageWillChange={this.onSelectedPageChanged.bind(this)}
          selectedPageChanged={this.onSelectedPageChanged.bind(this)}
          window={this.props.window}
          ref={swiper => this.swiper = swiper}>
          <Animated.View
            style={[animationStyle, styles.mainAnimationContainer, mainAnimationContainer]}>
            <CameraRollPicker
              currentAlbum={this.props.currentAlbum}
              scrollViewStyle={scrollViewStyle}
              scrollToRowOnSelection={this.state.isRetracted}
              onSelectedImagesChanged={this.onSelectedImagesChanged.bind(this)}
              replaceSelection={true}
              initalSelectedImageIndex={0}
              top={this.state.isRetracted
              ? 50
              : (this.props.window.width + TOP_BAR_HEIGHT)}
              willStartAnimating={this.willStartAnimating.bind(this)}
              finnishAnimation={this.finnishAnimation.bind(this)}
              getAnimationValue={this.getAnimationValue.bind(this)}
              animate={this.animate.bind(this)}
              resetAnimation={this.resetAnimation.bind(this)}
              style={cameraRollPickerView}
              maximum={1}
              window={this.props.window}
              imageMargin={2}
              imagesPerRow={4}></CameraRollPicker>
              <CropperView
                anim={this.state.anim}
                style={[styles.absolute, cropperView]}
                top={this.state.isRetracted
                ? 50
                : (this.props.window.width + TOP_BAR_HEIGHT)}
                willStartAnimating={this.willStartAnimating.bind(this)}
                finnishAnimation={this.finnishAnimation.bind(this)}
                getAnimationValue={this.getAnimationValue.bind(this)}
                animate={this.animate.bind(this)}
                resetAnimation={this.resetAnimation.bind(this)}
                image={this.state.currentImage}
                magnification={2.0}
                window={this.props.window}/>
          </Animated.View>
          <PhotoCamera
            style={styles.photoCamera}
            onPhotoTaken={this.onPhotoTaken.bind(this)}
            window={this.props.window}></PhotoCamera>
        </Swiper>
        <Animated.View
          style={[animationStyle, styles.absolute, styles.headerContainer, forceTopBarAnim]}>
          <Header
            currentAlbum={this.props.currentAlbum}
            showAlbumView={this.props.showAlbumView}
            hideAlbumView={this.props.hideAlbumView}
            font={this.props.font}
            hasNextButton={this.state.headerHasNextButton}
            height={TOP_BAR_HEIGHT}
            headerTitle={this.state.headerTitle}
            onCancelAction={this.onCancelAction.bind(this)}></Header>
        </Animated.View>
        <Footer
          libraryDisplayName={this.props.libraryDisplayName}
          photoDisplayName={this.props.photoDisplayName}
          font={this.props.font}
          onPress={this.onFooterPress.bind(this)}
          style={styles.footer}
          selectedTab={this.state.currentSwiperIndex === 0
          ? 'library'
          : 'photo'}
          height={FOOTER_HEIGHT}></Footer>
      </View>
    );
  }
}

PhotoManager.defaultProps = {
  window: Dimensions.get('window'),
  font: 'Arial',
  libraryDisplayName: 'Library',
  photoDisplayName: 'Photo'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  mainAnimationContainer: {
    marginTop: TOP_BAR_HEIGHT,
    overflow: 'hidden'
  },
  swiper: {},
  headerContainer: {
    height: TOP_BAR_HEIGHT
  },
  cropperContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0
  },
  photoCamera: {
    top: TOP_BAR_HEIGHT
  }
});