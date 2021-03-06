precision highp float;

uniform sampler2D u_positionTex;
uniform sampler2D u_normalTex;
uniform sampler2D u_colorTex;
uniform sampler2D u_depthTex;
uniform mat4 u_modelview;
uniform sampler2D u_shadeTex;
uniform int u_displayType;

uniform float u_zFar;
uniform float u_zNear;
uniform float u_time;

varying vec2 v_texcoord;

float linearizeDepth( float exp_depth, float near, float far ){
	return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) );
}

//Generate -1~1
float hash( float n ){ //Borrowed from voltage
    return fract(sin(n)*43758.5453);
}

bool isSilhouet(vec3 normal, float threshold){
	vec2 v_TexcoordOffsetRight = v_texcoord + vec2(2.0/960.0, 0.0);
	vec3 normalOffestRight = texture2D( u_normalTex, v_TexcoordOffsetRight).rgb;  
	float angleWithRight = dot(normal, normalOffestRight);

	vec2 v_TexcoordOffsetUp = v_texcoord + vec2(0.0, 2.0/540.0);
	vec3 normalOffestUp = texture2D( u_normalTex, v_TexcoordOffsetUp).rgb; 
	float angleWithUp = dot(normal, normalOffestUp);

	vec2 v_TexcoordOffsetLeft = v_texcoord - vec2(2.0/960.0, 0.0);
	vec3 normalOffestLeft = texture2D( u_normalTex, v_TexcoordOffsetLeft).rgb; 
	float angleWithLeft = dot(normal, normalOffestLeft);
	
	vec2 v_TexcoordOffsetDown = v_texcoord - vec2(0.0, 2.0/540.0);
	vec3 normalOffestDown = texture2D( u_normalTex, v_TexcoordOffsetDown).rgb; 
	float angleWithDown = dot(normal, normalOffestDown);
	
	if(angleWithRight < threshold || angleWithUp < threshold || angleWithLeft < threshold || angleWithDown < threshold)
		return true;
	else 
		return false;
}

void main()
{
	vec3 shade = texture2D( u_shadeTex, v_texcoord).rgb;
	vec3 normal = texture2D( u_normalTex, v_texcoord).rgb;  
	vec3 color = texture2D( u_colorTex, v_texcoord).rgb; 
	vec3 position = texture2D( u_positionTex, v_texcoord).rgb; 
	float depth = texture2D(u_depthTex, v_texcoord).r;
	depth = linearizeDepth( depth, u_zNear, u_zFar );
	

	
	float threshold = 0.5;
	

	
	if (u_displayType == 0){
		gl_FragColor = vec4(shade, 1.0); 
	}
	else if(u_displayType == 9){//Toon shading
		if(color.x == 1.0){
			
			if(isSilhouet(normal, threshold))
				gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
			else{
				float seg = 0.2;
				float toonShadingR = seg * float(int(shade.r / seg));
				float toonShadingG = seg * float(int(shade.g / seg));
				float toonShadingB = seg * float(int(shade.b / seg));
				vec3 toonShading = vec3(toonShadingR, toonShadingG, toonShadingB);
				gl_FragColor = vec4(toonShading, 1.0); 	
			}
		}
		else{
			gl_FragColor = vec4(shade, 1.0);
		}
	}
	else if(u_displayType == 8){
		if(color.x == 1.0){
			float radius = 0.01;
			float kernelSize = 100.0;
			float occlusion = 0.0;
			
			vec3 origin = vec3(position.x, position.y, depth);

			
			for(int i = 0; i < 100; ++i){
				vec3 randVector = vec3(hash(position.x * 0.01  + float(i)*0.1357),
								       hash(position.y * 0.01  + float(i)*0.2468),
								      (hash(position.z * 0.01  + float(i)*0.1479)+1.0) / 2.0);
				//vec3 randVector = vec3(0.0, 0.0, 1.0);
								  
				randVector = normalize(randVector);

				float scale = float(i) / kernelSize;
				scale = mix(0.1, 1.0, scale * scale);
				randVector = randVector * scale ;

				
				vec3 directionNotNormal;
				if (abs(normal.x) < 0.57735) {
				  directionNotNormal = vec3(1, 0, 0);
				} else if (abs(normal.y) < 0.57735) {
				  directionNotNormal = vec3(0, 1, 0);
				} else {
				  directionNotNormal = vec3(0, 0, 1);
				}
				
				/*vec3 perpendicularDirection1 = normalize(cross(normal, directionNotNormal));
				vec3 perpendicularDirection2 = normalize(cross(normal, perpendicularDirection1));
				vec3 temp =( randVector.z * normal ) + ( randVector.x * perpendicularDirection1 ) + ( randVector.y * perpendicularDirection2 );
				vec3 sampleVector = normalize(temp);*/
				
				vec3 rvec = normalize(vec3(0.0, //hash(position.x * 0.01 * u_time + float(i)*0.1234)
										   hash(position.y * 0.01  + float(i)*0.5678), 
										   hash(position.z * 0.01  + float(i)*0.1357)));
				//vec3 rvec = directionNotNormal;
				
				
				vec3 tangent = normalize(rvec - normal * dot(rvec, normal));
				vec3 bitangent = cross(normal, tangent);
				mat3 tbn = mat3(tangent, bitangent, normal);

				vec3 sampleVector = tbn * randVector;
				
				vec3 sample = origin + vec3((sampleVector * radius).x, (sampleVector * radius).y, -(sampleVector * radius).z / 2.0);
						
									
				float sampleDepth = texture2D(u_depthTex, v_texcoord + (sampleVector * radius).xy ).r;
				sampleDepth = linearizeDepth( sampleDepth, u_zNear, u_zFar );
	
				if(sampleDepth <= sample.z)
					occlusion += 1.0;
				
			}
			
			gl_FragColor = vec4(1.0 - occlusion/kernelSize, 1.0 - occlusion/kernelSize, 1.0 - occlusion/kernelSize, 1.0);

			
			
		}
	}
	else if(u_displayType == 7 || u_displayType == 6|| u_displayType == 5){		
		if(color.x == 1.0){
			if(isSilhouet(normal, threshold))
				gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
			else
				gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		}
		else
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}


