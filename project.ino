#include "DHT.h"
#include <Servo.h>

#define DHTPIN 3
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int LDR_SENSOR_PIN = A0;
const int MQ_SENSOR_PIN = A1;

const int RED_LED_PIN = 4;
const int YELLOW_LED_PIN = 7;
const int GREEN_LED_PIN = 8;
const int WHITE_LED_PIN = 9;
const int RED_PIN = 12;
const int RED2_PIN = 13;
const int FAN_PIN = 10;
const int SERVO_1_PIN = A2;
const int SERVO_2_PIN = A3;

Servo servo1;
Servo servo2;

void setup()
{
    Serial.begin(9600);
    pinMode(LDR_SENSOR_PIN, INPUT);
    pinMode(MQ_SENSOR_PIN, INPUT);

    pinMode(RED_LED_PIN, OUTPUT);
    pinMode(YELLOW_LED_PIN, OUTPUT);
    pinMode(GREEN_LED_PIN, OUTPUT);
    pinMode(WHITE_LED_PIN, OUTPUT);
    pinMode(RED_PIN, OUTPUT);
    pinMode(RED2_PIN, OUTPUT);
    pinMode(FAN_PIN, OUTPUT);

    servo1.attach(SERVO_1_PIN);
    servo2.attach(SERVO_2_PIN);

    dht.begin();
}

void loop()
{

    int lightIntensity = analogRead(LDR_SENSOR_PIN);
    int mqValue = analogRead(MQ_SENSOR_PIN);
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity))
    {
        Serial.println("Failed to read from DHT sensor!");
        return;
    }

    Serial.print(lightIntensity);
    Serial.print(",");
    Serial.print(temperature);
    Serial.print(",");
    Serial.print(humidity);
    Serial.print(",");
    Serial.println(mqValue);

    // LDR
    int dayThreshold = 30;

    if (lightIntensity < dayThreshold)
    {
        // NIGHT
        analogWrite(WHITE_LED_PIN, 255);
    }
    else
    {
        // DAY
        analogWrite(WHITE_LED_PIN, 0);
    }

    // DHT SENSOR
    float h = dht.readHumidity();
    // Read temperature as Celsius (the default)
    float t = dht.readTemperature();
    // Check if any reads failed and exit early (to try again).
    if (isnan(h) || isnan(t))
    {
        Serial.println(F("Failed to read from DHT sensor!"));
        return;
    }

    if (t > 50)
    {
        digitalWrite(FAN_PIN, HIGH);
    }
    else
    {
        digitalWrite(FAN_PIN, LOW);
    }

    /*
    CONTROL ARDUINO FROM WEB
     */
    if (Serial.available() > 0)
    {
        char data = Serial.read();

        if (!data)
            Serial.end();

        if (data == '1')
        {
            digitalWrite(FAN_PIN, HIGH);
            Serial.println("Fan Turned ON");
        }

        if (data == '2')
        {
            digitalWrite(FAN_PIN, LOW);
            Serial.println("Fan Turned OFF");
        }

        if (data == '3')
        {
            servo1.write(30);
            Serial.println("Door Opened");
        }

        if (data == '4')
        {
            servo1.write(180);
            Serial.println("Door Closed");
        }

        if (data == '5')
        {
            servo2.write(180);
            Serial.println("Door Unlocked");
        }

        if (data == '6')
        {
            servo2.write(90);
            Serial.println("Door Lokced");
        }
        delay(1000);
    }
}