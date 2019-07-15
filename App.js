import React, { Component } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform, Image, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import Constants from 'expo-constants';
import markerData from './markerData.json';
import * as geolib from 'geolib';
import { Buffer } from 'buffer';
import { base64ArrayBuffer } from './base64ArrayBuffer';
// import { getImagesFromDB } from './api';
import { Button } from 'react-native-elements';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;

const SPACE = 0.01;
const LATITUDE = 21.003833318;
const LONGITUDE = 105.83916331;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const GEOLOCATION_OPTIONS = { accuracy: 4, timeInterval: 30000, distanceInterval: 150 };

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      mapRegion: null,
      hasLocationPermissions: false,
      locationResult: null,
      intervalIsSet: false,
      densityInterval : false,
      circle: {
        center: {
          latitude: null,
          longitude: null,
        },
        radius: 2000,
      },
      errorMessage: null,
      watchId: null,
      markers: markerData.coordinates,
      density: null
    }
  }
  onRegionChange = (region) => {
    console.log('onRegionChange', region);
  };

  onRegionChangeComplete = (region) => {
    console.log('onRegionChangeComplete', region);
  };

  getImagesFromDB = () => {
    fetch('https://server-mongodb.wise-paas.io/api/getImageData')
      .then((data) => data.json())
      .then((res) => {
        var buffer = new Buffer.alloc(921600);
        buffer = res.data.data;
        let uri = base64ArrayBuffer(buffer);
        this.setState({ data: uri })
        console.log("getImage", this.state.intervalIsSet);
        // console.log(this.state.intervalIsSet);
        // console.log(this.state.data);
      });
  };

  getDensityFromDB = () => {
    console.log('Hello DB');
    fetch('https://server-mongodb.wise-paas.io/api/getDensityData')
      .then((data) => data.json())
      .then((res) => {
        this.setState({ density: res.data.density });
        // console.log(this.state.density);
      })
  }

  chooseColor = (density) => {
    if (density <= 30) return "#78ff60"
    else if (density < 50) return "#ffff1e"
    else return "#e20404"
  }

  componentDidMount() {
    if (Platform.OS === 'android' && !Constants.isDevice) {
      this.setState({
        errorMessage: 'Oops, this will not work on Sketch in an Android emulator. Try it on your device!',
      });
    } else {
      this.getImagesFromDB();
      this.getDensityFromDB();
      if (!this.state.intervalIsSet) {
        let interval = setInterval(this.getImagesFromDB, 10000);
        this.setState({ intervalIsSet: interval });
      }
      if(!this.state.densityInterval) {
        let interval2 = setInterval(this.getDensityFromDB, 3000);
        this.setState( { densityInterval: interval2 });
      }
      this._getLocationAsync();
    }
  }



  // _handleMapRegionChange = mapRegion => {
  //   console.log(mapRegion);
  //   this.setState({ mapRegion });
  // };

  locationChanged = userLocation => {
    this.setState({ locationResult: JSON.stringify(userLocation) });
    this.setState({ mapRegion: { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA } });
    this.setState(prevState => {
      let circle = Object.assign({}, prevState.circle);
      circle.center.latitude = userLocation.coords.latitude;
      circle.center.longitude = userLocation.coords.longitude;
      return { circle };
    })
    console.log(this.state.locationResult);
    console.log(this.state.mapRegion);
  }

  _getLocationAsync = async () => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        locationResult: 'Permission to access location was denied',
      });
    } else {
      this.setState({ hasLocationPermissions: true });
    }

    // let userLocation = await Location.getCurrentPositionAsync({});
    this.watchId = await Location.watchPositionAsync(GEOLOCATION_OPTIONS, this.locationChanged);
    // this.setState({ locationResult: JSON.stringify(userLocation) });
    // this.setState({ mapRegion: { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA}})
  };

  filterMarker() {
    let filter = this.state.markers.filter(marker =>
      geolib.isPointWithinRadius({
        latitude:
          marker.latitude, longitude: marker.longitude
      }, {
          latitude: this.state.mapRegion.latitude, longitude: this.state.mapRegion.longitude
        }, 2000))
    console.log('afterCaculation', this.state.mapRegion);
    return filter;
  }


  componentWillUnmount() {
    this.watchId.remove();
    clearInterval(this.state.intervalIsSet);
    clearInterval(this.state.densityInterval);
  }

  render() {
    return (
      <View style={styles.container}>
        {
          this.state.locationResult === null ?
            <ActivityIndicator size="large" color="#0000ff" /> :
            this.state.hasLocationPermissions === false ?
              <Text>Location permissions are not granted!</Text> :
              this.state.mapRegion === null ?
                <Text>Map Region does not exist</Text> :
                <MapView
                  style={{ alignSelf: 'stretch', height: height }}
                  initialRegion={this.state.mapRegion}
                  onRegionChange={this.onRegionChange}
                  onRegionChangeComplete={this.onRegionChangeComplete}
                  showsUserLocation={true}
                >
                  <MapView.Circle
                    center={{
                      latitude: this.state.mapRegion.latitude,
                      longitude: this.state.mapRegion.longitude
                    }}
                    radius={this.state.circle.radius}
                    strokeColor="rgba(0,0,0,0.5)"
                    zIndex={2}
                    strokeWidth={1}
                  />
                  {/* {
                    this.state.markers.map(marker => {
                      return (
                        <Marker
                          key={marker.key}
                          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        />
                      )
                    })} */}
                  {
                    this.filterMarker().map(marker => {
                      return (
                        <Marker
                          key={marker.key}
                          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}>
                          <Callout>
                            <Image
                              style={{ width: 100, height: 100 }}
                              // source={require('./images/daicoviet.jpg')} />
                              source={{ uri: `data:image/jpg;base64,${this.state.data}` }} />
                          </Callout>
                        </Marker>
                      )
                    })
                  }
                  {
                    this.filterMarker().map(marker => {
                      return (
                        <Polyline
                        key={marker.key}
                        coordinates={[
                          { latitude: marker.routeStartLatitude, longitude: marker.routeStartLongitude },
                          { latitude: marker.routeEndLatitude, longitude: marker.routeEndLongitude },
                        ]}
                        strokeColor={this.chooseColor(this.state.density)} // fallback for when `strokeColors` is not supported by the map-provider
                        strokeWidth={5}
                        />
                      )
                    })
                  }
                  {/* <Marker
                    coordinate={{
                      latitude: 21.007535,
                      longitude: 105.841425,
                    }}
                  >
                    <Callout>
                      <Image
                        style={{ width: 100, height: 100 }}
                        source={require('./images/image.jpg')} />
                    </Callout>
                  </Marker>
                  <Polyline
                    coordinates={[
                      { latitude: 21.007535, longitude: 105.841425 },
                      { latitude: 21.005099, longitude: 105.841457 },
                    ]}
                    strokeColor={this.chooseColor(70)} // fallback for when `strokeColors` is not supported by the map-provider
                    strokeWidth={5}
                  />
                  <Marker
                    coordinate={{
                      latitude: 21.001849,
                      longitude: 105.841543,
                    }}
                  >
                    <Callout>
                      <Image
                        style={{ width: 100, height: 100 }}
                        source={require('./images/lethanhnghi.jpg')} />
                    </Callout>
                  </Marker> */}
                  {/* <Marker
                  coordinate={{
                    latitude: 21.036343,
                    longitude: 105.789911,
                  }}
                >
                  <Callout>
                      <Image
                        style={{ width: 100, height: 100 }}
                        source={{uri: `data:image/jpg;base64,${this.state.data}`}} />
                    </Callout>
                  </Marker>
                  <Polyline
                  coordinates={[
                    { latitude: 21.036343, longitude: 105.789911 },
                    { latitude: 21.035293, longitude: 105.793048 },
                  ]}
                  strokeColor={this.chooseColor(this.state.density)} // fallback for when `strokeColors` is not supported by the map-provider
                  strokeWidth={5}
                  />
                  <Polyline
                    coordinates={[
                      { latitude: 21.001849, longitude: 105.841543 },
                      { latitude: 21.001834, longitude: 105.843919 },
                    ]}
                    strokeColor={this.chooseColor(12)} // fallback for when `strokeColors` is not supported by the map-provider
                    strokeWidth={5}
                  /> */}
                  {/* <Marker
                    coordinate={{
                      latitude: 21.007812,
                      longitude: 105.841460,
                    }}
                  >
                    <Callout>
                      <Image
                        style={{ width: 100, height: 100 }}
                        // source={require('./images/daicoviet.jpg')} />
                        source={{ uri: `data:image/jpg;base64,${this.state.data}` }} />
                    </Callout>
                  </Marker> */}
                  <Polyline
                    coordinates={[
                      { latitude: 21.007812, longitude: 105.841460 },
                      { latitude: 21.007762, longitude: 105.842544 },
                    ]}
                    strokeColor={this.chooseColor(this.state.density)} // fallback for when `strokeColors` is not supported by the map-provider
                    strokeWidth={5}
                  />
                </MapView>
        }
      </View>

      // <View>
      //   <Text>{location}</Text>
      // </View>
    );
    // } else return (
    //   <View>
    //     <ActivityIndicator size="large" color="#0000ff" />
    //   </View>
    // )

  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    marginLeft: 46,
    marginTop: 33,
    fontWeight: 'bold',
  },
});
